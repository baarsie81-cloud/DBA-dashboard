# Dashboard authentication

The existing shared organisation login is retained. All dashboard Server Actions that access protected data and exported database queries require a valid signed session.

Sessions expire after at most one hour without renewal. Trusted input in a visible dashboard tab renews a still-valid session through a same-origin POST to `/api/session`, limited to one automatic request per 30 seconds. The server determines expiration and refuses to revive an expired cookie. Passive timers and GET inspection never renew a session. The timing can expire a session up to 30 seconds earlier than the last interaction plus one hour.

The browser warns during the last five minutes. At expiration it checks the shared cookie before navigating to login, so activity in another tab is respected. Temporary connection errors retain the screen and unsaved input; the server still rejects expired sessions. Browser timer suspension can delay the visible redirect, but cannot extend server access.

The `dba_session_v2` cookie replaces the earlier ten-hour cookie. Its signed payload is checked against the current configured username. Changing only the password does not revoke an already issued v2 cookie.

## Login rate limit

`loginAction` checks Vercel Firewall before bcrypt. Allowing a request through the rate limit still requires valid credentials. An exceeded limit returns a retry message in the form. Missing configuration, a failed SDK call, or missing Vercel request context returns a temporary unavailable message without checking the password. The SDK call has a 1.5-second timeout. This affects new logins. Existing signed cookies, session renewal and dashboard requests use their existing paths. Local development outside Vercel cannot sign in with this action.

The SDK receives only the platform's `x-vercel-forwarded-for` IP and a host from Vercel system environment variables. Production uses `VERCEL_PROJECT_PRODUCTION_URL`, expected to be `dba-dashboard.vercel.app`. Previews use `VERCEL_URL` in their own project. The generated production deployment URL is gated by Vercel Authentication, while a read-only GET to the public production hostname reached the SDK path without a token and returned 404 with no rule configured.

**Production release blocker:** The successful isolated SDK tests used an automation token in a protected preview. Neither those tests nor the public 404 prove that a server-side SDK call using the public production alias works without a token. Before release, prove that variant with the same routing and protection setup in the isolated test project and fictitious credentials. Confirm accepted requests, a shared IP quota, recovery and that the same in-action check protects every supported invocation. The existing isolated tests covered both normal form modes. Alternate invocation and IP preservation through forwarding were not proven against the deployment. Keep Vercel system environment variables enabled and confirm the production variable resolves to the expected public alias.

### Activation and rollback

1. Complete the isolated verification above. Review the production deployment, the expected public alias and the existing published/draft firewall configuration. Obtain explicit approval for production activation before changing the rule or deploying.
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
