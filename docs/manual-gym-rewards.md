# Manual gym reward points — 2026-09-13

## Delivered behavior

Members without a WHOOP connection or a WHOOP workout for the current gym-local day
save a daily check-in with workout completed, then scan their gym's rotating workout
QR. The server credits 40 spendable reward points plus 10/6 points for each of the six
existing eligible habits, rounded to one decimal (maximum 50). Sleep/recovery adds
nothing. Health Score and WHOOP scoring are unchanged.

A per-user row lock and per-user/day entitlement serialize awards. Repeated scans
or check-in saves adjust the existing daily amount; they never add a second 40.
Manual and WHOOP entitlements share a primary key and have an explicit source.
A WHOOP connection/import later in the day cannot increase a manual award. Deleted
WHOOP workouts also block manual credit for their day. Switching gyms/calendars or
legacy credits requires review rather than paying twice. Habit reductions that
would make the balance negative place the entitlement on a redemption hold.

The database independently verifies current membership, membership date, QR lifetime
and expiry, and the QR issuer's current admin/operator authorization. The route checks
the authenticated custom session, same-origin request, request UUID and QR signature.
Client-supplied amounts, scores, user IDs and gym IDs are rejected.

## Production Supabase

Applied and verified:
- `20260913193751_repair_gym_reward_dependencies.sql`
- `20260913193812_manual_gym_reward_points.sql`

The first adds the inspected missing invitation, verification, configuration, ledger,
entitlement, offer and redemption dependencies. The second adds manual verification
and reward accounting. Files use the versions recorded by production migration history.
Do not replay older repository migrations: this database has an independently
reconciled history. No old migration was blindly applied.

Verification is enabled; manual rewards are enabled from
`2026-09-13T19:38:12.317942Z`; WHOOP rewards remain disabled with no conversion rate
or cap configured. Existing balances were neither modified nor reconstructed.
No opening ledger entries, historical credits, offers or redemptions were created.
The original migration proposal was rejected by automatic approval review because
of opening entries and broad privilege changes. It was materially narrowed, retested,
and then accepted. Only check-in/reward-history client writes and identity
reassignment/deletion were restricted; WHOOP/profile permissions remain unchanged.

After migration: 5 user rows, unchanged balances, 0 reward transactions/entitlements,
0 scans, 0 invitations. `bashar test` remains
`56e342f6-9799-4947-8c69-9b3de4ba7f3d`, timezone UTC, 0 members, 1 operator assignment.
No gyms, memberships or operators were created, deleted or assigned.

All eight new public tables have RLS, no anonymous read or client insert grants,
and server read access. The manual RPC is server-only; its privileged implementations
are in `thrivv_private`, inaccessible to client roles. The application uses custom
JWT sessions rather than Supabase Auth JWT identity, so authorization stays in the
server routes and database membership/operator checks.

Security advisors report no new warning/error findings. Existing unrelated findings
remain: RLS disabled on nutrition_plans/risk_events/device_registry, four legacy
functions with mutable search paths and disabled leaked-password protection.
No-policy INFO findings are intentional for server-only tables.
See https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public
and https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable.

## Verification

- 191 tests across 32 suites, TypeScript, lint and production build pass.
- New PGlite rehearsal: 40–50 credits, repeat scans, habit corrections, WHOOP conflicts,
  source conflicts, no backfill, expiry/operator/membership checks, actual balance
  debits on redemption, duplicate redemption and correction holds, invitation issuer
  authorization/expiry/tenant checks, RLS and client-role denial.
- Chromium at 1440px and 390px: actual component, synthetic APIs and synthetic camera
  video containing a QR decoded by jsQR; check-in gate, request payload, credit
  feedback, repeat scan, camera cleanup, retry, no overflow or page errors.
- No real phone-camera or live member reward/redemption transaction was performed.
  PGlite serializes requests; it is not a multi-connection concurrency load test.
- Build used synthetic environment values, not production secrets.

Rehearsal: run `node __tests__/gym-workout-qr/manual-database.mjs` with PGLITE_MODULE
pointing to an installed PGlite module if necessary. Browser fixture: bundle
`fixtures/manual.tsx` with esbuild `--bundle --jsx=automatic --platform=browser`,
NODE_ENV=production and the gym-portal fixture next/link alias; compile app/globals.css
with Tailwind, then pass the JS/CSS files to `manual-browser.mjs`. PLAYWRIGHT_MODULE
and CHROMIUM_PATH can select existing local browser dependencies.

## Remaining deployment checks

The GitHub change needs deployment before the manual controls appear. Vercel's
connector returns no teams and 403 for the project; production aliases and logs cannot
be independently verified. The joining-code encryption key remains a Vercel task:
validate server-only GYM_CODE_ENCRYPTION_KEY (canonical base64, 32 random bytes) and
redeploy. Do not overwrite a valid existing key. Joining codes and workout QRs remain
separate. No restaurant offers were seeded or fulfillment behavior changed.
