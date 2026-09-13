# Gym portal repair audit — 2026-09-13

## Status and provenance

Local work only on `codex/gym-portal-repairs`. No push, merge, preview deployment,
production deployment, secret change, or production migration was performed.

GitHub recheck: main `75db0924851fb650897f6cd48c16e2e2824cde54`; remote
`codex/activate-gym-rewards` `7cc177cb9e5a92dc26941f6f7b86f039736bfab0`, one commit
ahead of main, not merged. This workspace's starting commit `bae25bc` has the
same tree as that remote feature commit (`5c74595e22e2749bc9933e0312df065a9c0a37ec`).
Existing feature fixes were retained rather than reimplemented.

Main's GitHub Vercel status is successful and points to deployment
`9zYERdaiiAmAY4KznHaof3CJBoK3`. This is not proof of the current production alias.
The connected Vercel account returned no teams; actual production alias SHA,
runtime configuration, cookie headers, and logs could not be verified.

Read-only Supabase inspection confirmed the existing gym
`56e342f6-9799-4947-8c69-9b3de4ba7f3d`, named `bashar test`, was preserved.
`gym_join_codes` exists with encryption columns and service-role read/insert/update
permissions, but contains no codes. `gym_reward_config` is absent. No gym, member,
operator, balance, or reward activation data was changed.

## Causes and limits

- **Joining code:** the code path requires a canonical base64 32-byte
  `GYM_CODE_ENCRYPTION_KEY` before saving encrypted display text and its joining hash.
  The inspected schema/permissions do not explain the screenshot's failure.
  Missing/invalid deployed encryption configuration remains a hypothesis, not a
  confirmed production root cause. Added explicit configuration error classification,
  safe database error-code logging, and explicit upsert conflict target. Do not
  replace an existing encryption key or silently derive a different one.
- **Workout QR:** main lacks the existing feature-branch domain-separated signing
  fallback. Reused that implementation and its server-generated scannable SVG.
  Production signing configuration and deployed SHA remain unverified. The client
  was discarding a still-valid QR on failed refresh and ticking twice per second;
  it now retains valid codes, removes expired codes, and ticks once per second.
- **Login:** hostname detection overrode explicit member selection. Explicit portal
  switching now changes context and canonical host, with allowlisted gym return paths.
  Existing server-side role routing and authorization are retained.
- **Logout:** Sidebar only removed local storage and navigated; it never called
  server logout. It now checks the real response before clearing state and replacing
  the document. Existing stateless JWTs also needed server-side revocation to reject
  copied tokens. New session IDs prevent same-second relogins reusing a revoked JWT.
- **Stale UI / responsiveness:** local-storage identity and a separate Sidebar auth
  request were replaced with one authoritative layout check. Return-to-tab and
  other-tab logout revalidate, with private content concealed while pending.
  Mounted child state survives ordinary revalidation so an open QR stays open.
  Removed layout-wide transition-all; scoped portal control transitions to 180ms
  with reduced-motion handling. No unmeasured blur/shadow redesign was made.

## Exact changed application files

- `lib/auth.ts`, `app/api/auth/logout/route.ts`, new `lib/client-session.ts`
- `components/MainLayout.tsx`, `components/Sidebar.tsx`, `app/globals.css`
- `lib/gym-routing.ts`, `app/member/login/page.tsx`
- `lib/gym-code-encryption.ts`, `app/api/gym/[gym_id]/code/route.ts`
- `components/GymJoinCode.tsx`, `components/GymWorkoutQr.tsx`
- `app/gym/[gym_id]/dashboard/_components/GymHeader.tsx`
- `.env.example` (documentation only, no real credentials)
- `supabase/migrations/20260913181537_revoked_app_sessions.sql` (NOT APPLIED)

Regression additions/updates are in `__tests__/gym-portal/` and
`__tests__/gym-codes/routes.test.ts`.

## Verification

- `npm test -- --runInBand`: 32 suites, 187 tests pass.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`: pass. Build used synthetic
  environment values, not production credentials. Existing build diagnostics include
  stale Browserslist data and dynamic-cookie prerender probes.
- Isolated PGlite joining-code rehearsal: valid/invalid joins, gym boundaries,
  replacement invalidation, unchanged memberships/balances, rate limit, restricted
  grants. PGlite serializes queries; not a production concurrency/load test.
- Isolated new revocation migration: server read/insert allowed; clients denied;
  service role cannot undo revocations.
- Real Chromium at 1440px and 390px, synthetic API harness using actual components:
  create/replace/persist, duplicate-click protection, rotating SVG rendering,
  refresh failure while valid, expiry hiding, retry, closed/hidden polling cleanup,
  refresh on return, logout failure/success, Back/refresh, other same-origin tab,
  member/gym login switches, member sidebar logout regression, no horizontal overflow.
- Built Next application at both widths: public login switches, unauthenticated
  admin redirect, `/api/auth/me` denial. Browser scripts:
  `__tests__/gym-portal/browser-rehearsal.mjs` and `login-browser.mjs`.
  Harness fixtures are test-only and are not application routes.
- Existing QR token/decoder/scan-route tests passed. No live physical-camera
  display-to-scanner workout verification was performed: no authorized test member,
  owned WHOOP workout, or enabled verification setup was provided.

Browser harness requires esbuild, Tailwind CLI, Playwright, and Chromium. Bundle
`fixtures/harness.tsx` with the fixture next/link and next/navigation aliases;
define NODE_ENV=production and NEXT_PUBLIC_APP_HOSTNAME / GYM_HOSTNAME explicitly.
Pass the resulting JS and generated CSS paths to `browser-rehearsal.mjs`.
Optional `CHROMIUM_PATH` and `PLAYWRIGHT_MODULE` select isolated installations.
Database rehearsals accept `PGLITE_MODULE` for an isolated PGlite installation.

## Approval gates / unfinished production verification

1. Restore Vercel project visibility to confirm alias, logs, configuration presence,
   and actual cookie scope. Do not print secret values.
2. Obtain separate approval before configuring any missing encryption/signing secret.
3. **Apply the reviewed revocation migration before deploying this authentication
   code.** Authentication intentionally fails closed if the table is unavailable.
   This affects member authentication too; do not deploy the code ahead of the table.
4. Reward schema activation remains separate. Do not activate redeemable rewards or
   invent a Health Score conversion merely to make dashboard cards show numbers.
5. Obtain separate approval for merge/deployment, then verify joining-code mutation,
   persistent display, real member join, live cookies, QR scanner flow, cross-host
   logout, and role routing with authorized test accounts.

Cross-origin localStorage events cannot notify the other hostname. Shared-session
revocation is enforced on its next server request, and private pages revalidate when
made visible. Independent host-only sessions are separate sessions, not a global
all-device logout. Their real deployed cookie scopes still need inspection.
