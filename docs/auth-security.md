# Dashboard authentication

The existing shared organisation login is retained. All dashboard Server Actions that access protected data and exported database queries require a valid signed session.

Sessions expire after at most one hour without renewal. Trusted input in a visible dashboard tab renews a still-valid session through a same-origin POST to `/api/session`, limited to one automatic request per 30 seconds. The server determines expiration and refuses to revive an expired cookie. Passive timers and GET inspection never renew a session. The timing can expire a session up to 30 seconds earlier than the last interaction plus one hour.

The browser warns during the last five minutes. At expiration it checks the shared cookie before navigating to login, so activity in another tab is respected. Temporary connection errors retain the screen and unsaved input; the server still rejects expired sessions. Browser timer suspension can delay the visible redirect, but cannot extend server access.

The `dba_session_v2` cookie replaces the earlier ten-hour cookie. Its signed payload is checked against the current configured username. Changing only the password does not revoke an already issued v2 cookie.

## Login rate limit

`loginAction` checks Vercel Firewall before bcrypt. Allowing a request through the rate limit still requires valid credentials. An exceeded limit returns a retry message in the form. Missing configuration, a failed SDK call, or missing Vercel request context returns a temporary unavailable message without checking the password. The SDK call has a 1.5-second timeout. This affects new logins. Existing signed cookies, session renewal and dashboard requests use their existing paths.

The SDK receives only the platform's `x-vercel-forwarded-for` IP and a host from Vercel system environment variables. Production uses `VERCEL_PROJECT_PRODUCTION_URL`, expected to be `dba-dashboard.vercel.app`. Previews use `VERCEL_URL` in their own project. The generated production deployment URL is gated by Vercel Authentication, while a read-only GET to the public production hostname reached the SDK path without a token and returned 404 with no rule configured.

The isolated test project also ran the SDK through its public production alias without an automation token, using the same Vercel Authentication mode as DBA. The generated deployment URL remained protected. With a two-request limit, one successful login on each of two registered form routes exhausted the allowance for their shared IP. Both forms were then limited, and the existing test session could still be used and renewed. Keep Vercel system environment variables enabled and confirm the production variable resolves to the expected public alias.

**Production release blocker:** the isolated checks cover a normal form and a second test page that explicitly registers the same action. IP preservation when Next.js internally forwards a Server Action from a page that does not register it remains unverified. Keep this open before release.

### Local development

`npm run test:auth` uses synthetic inputs and works outside Vercel. Interactive login under `npm run dev` cannot pass the Vercel check, so this prevents local testing of authenticated screens. If interactive local development is needed, add an explicit opt-in for `next dev` on loopback outside Vercel and require a dedicated fictional username and password fixture. Reuse bcrypt and signed sessions, keep a separate local session secret and use only a local or isolated synthetic database. The opt-in must be ignored by all production builds and hosted previews. The local opt-in is a follow-up proposal.

### Activation and rollback

1. Resolve the remaining forwarding verification above. Review the production deployment, the expected public alias and the existing published/draft firewall configuration. Obtain explicit approval for production activation before changing the rule or deploying.
2. In the DBA Vercel project, create a custom rule with the two conditions **@vercel/firewall equals `dba-login-v1`** and **Environment equals Production**. Select **Rate Limit**, counting key **IP**, algorithm **Fixed window**, limit **20** and window **300 seconds**. Set the over-limit outcome to **Too Many Requests (429)** and leave persistent action unset. Avoid generic path, method or account conditions. The SDK handles its own response and the Server Action returns a form message.
3. Review the draft diff and publish the rule immediately before releasing the approved code. Publication changes the project's active firewall. The existing login does not call this SDK rule. The new code requires the rule to be active before it can accept a login. Verify the active configuration, release the approved build, and watch for unexpected unavailability, rate-limit events or session problems.
4. If login fails after release, roll back to the last known-good deployment first and verify the production alias resolves to that deployment. Then remove or disable this rule and publish the firewall change. Removing the rule while the new action is active causes new logins to fail closed.

Vercel counts per region and colleagues on the same public IP share the regional allowance. The check increases latency on new logins. The existing Vercel rate-limit meter is usage-based, starting at USD 0.50 per million allowed requests, with regional prices and normal function usage.

[Vercel Rate Limiting SDK](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk) · [Vercel request headers](https://vercel.com/docs/headers/request-headers) · [Vercel rate limiting and pricing](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)

## Verification

- `npm run test:auth`: synthetic sessions, signed token validation, expiry boundaries, same-origin renewal, unauthenticated action and query rejection, activity timers, multiple tabs and login rate-limit ordering and failures. No database or production credentials.
- `node --import tsx scripts/verify-mortgage-distribution.ts`: existing rendering/query regression check, with a synthetic Next.js request context and its existing database proxy.
- `npm run typecheck`, `npm run lint`, `npm run build`.

Standalone checks that call protected database queries now need an authenticated request context. `scripts/with-test-session.ts` is only for synthetic, database-free checks; it is never imported by application code.
