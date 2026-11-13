# Dashboard authentication

The existing shared organisation login is retained. All dashboard Server Actions and exported database queries require a valid signed session. There is no database migration or new runtime dependency.

Sessions expire after at most one hour without renewal. Trusted input in a visible dashboard tab renews a still-valid session through a same-origin POST to `/api/session`, limited to one automatic request per 30 seconds. The server determines expiration and refuses to revive an expired cookie. Passive timers and GET inspection never renew a session. The timing can expire a session up to 30 seconds earlier than the last interaction plus one hour.

The browser warns during the last five minutes. At expiration it checks the shared cookie before navigating to login, so activity in another tab is respected. Temporary connection errors retain the screen and unsaved input; the server still rejects expired sessions. Browser timer suspension can delay the visible redirect, but cannot extend server access.

The new `dba_session_v2` cookie invalidates earlier ten-hour sessions once on release. Its signed payload is checked against the current configured username. Changing only a password does not revoke an already issued v2 cookie; server-side session revocation and login rate limiting remain separate follow-up decisions.

## Verification

- `npm run test:auth`: synthetic sessions, signed token validation, expiry boundaries, same-origin renewal, unauthenticated action and query rejection, activity timers and multiple tabs. No database or production credentials.
- `node --import tsx scripts/verify-mortgage-distribution.ts`: existing rendering/query regression check, with a synthetic Next.js request context and its existing database proxy.
- `npm run typecheck`, `npm run lint`, `npm run build`.

Standalone checks that call protected database queries now need an authenticated request context. `scripts/with-test-session.ts` is only for synthetic, database-free checks; it is never imported by application code.
