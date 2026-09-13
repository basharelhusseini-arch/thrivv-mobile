# Gym and workout rewards branch

> Production-readiness update (2026-09-13): Vercel now schedules a protected daily
> WHOOP queue run, and member reward/verification screens also trigger the existing
> debounced sync during active use. Gym verification is activated in Supabase by a
> separate migration. Redeemable daily points remain disabled until a conversion
> rate and daily cap are explicitly approved.

This branch is NOT a production rollout. Do not deploy the branch against the current database without reconciling its schema and applying the reviewed migration first.

## Implemented

- Reuses Thrivv and its existing gym dashboard; one gym per member, many gyms supported in shared tables. Membership is stored in users.gym_id to preserve existing analytics queries. Workout records retain the gym attribution from first import.
- Seven-day reusable invitation links, server-side membership acceptance, no self-service transfer to another gym. The existing global-admin assignment endpoint remains available to administrators.
- WHOOP workout import with pagination, elapsed duration in milliseconds, strain, score state, timestamps, provider IDs and owner checks. No workout rewards are issued yet.
- Seven-day rolling reconciliation; successful complete responses mark missing workouts in that window deleted. Older changes are not reconciled automatically. A webhook or wider reconciliation policy is needed before promising lifetime corrections.
- Shared per-member database lock for manual/background sync, provider timeouts, protected background endpoint, deferred retries. The endpoint handles one due member per invocation and schedules the next successful sync one hour later. Scheduler cadence/capacity must be chosen for the actual member count. No scheduler is activated or configured in this branch.
- WHOOP credentials moved transactionally to a server-only table. Legacy token copies cleared within the same transaction. Runtime session signing fails closed if its secret is missing.
- Existing check-in/nutrition reward formula retained. Credits adjust an authoritative source record under a member row lock, append the delta to a ledger and update the balance atomically. Debits survive later daily recalculation. A correction that would make a balance negative is rejected for review.
- Persistent, atomic redemptions with idempotent request IDs and server-owned offer prices. No offers are seeded or activated. Existing cards show Coming soon until corresponding genuine offers are configured. Redemption is a pending record, NOT a fulfilled restaurant voucher; merchant validation/fulfillment is still required.
- Signup/login initialise member profiles using verified identity. Existing account/password/session design is preserved. Risk API no longer trusts x-user-id.

## Blocking decisions / production preflight

1. Verify production NEXT_PUBLIC_SUPABASE_URL and the deployed commit. Connected project ncpcosjwazjbpogugysv is not proven to be production.
2. Compare migration prerequisites with the actual target. The new migration assumes existing users, reward_history, whoop_data, health_scores, verification_events and daily_checkins. Do not replay migrations 001–017. Check user IDs, auth identities, existing grants, table owners and column differences.
3. Reconcile balances/history. The migration preserves existing users.reward_points as an opening ledger entry, and uses reward_history as the baseline for future adjustments. It explicitly stops if balances are absent but nonzero reward history exists. Review any existing discrepancies, NULL/negative values, duplicate WHOOP account mappings and orphaned profiles before applying.
4. Approve strain/duration formula, daily caps, rounding, eligibility date, historic earning, manual activity treatment and replace-vs-supplement rules. Workout rewards are intentionally unimplemented/disabled until these decisions are supplied. Existing daily reward rules, including manual inputs, still apply.
5. Confirm actual partner offers, eligibility, expiry, redemption cancellation and merchant validation. No fake verification or email delivery is claimed.
6. Test WHOOP OAuth/refresh and signup/confirmation with dedicated staging accounts. Verify redirect URI and permissions in WHOOP's dashboard. Database migration, deployment and schedule activation each require explicit approval.

## Configuration

Existing: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, WHOOP_REDIRECT_URI, NEXT_PUBLIC_SITE_URL, COOKIE_DOMAIN.

New: CRON_SECRET (server-only). `GYM_WORKOUT_QR_SECRET` is an optional dedicated
32-byte base64 override; when absent, the app derives a domain-separated QR key
from the required `JWT_SECRET`.

Vercel calls `GET /api/internal/whoop/process` daily with `Authorization: Bearer
<CRON_SECRET>`. `POST` remains available for an authorized manual run. No secret
values should be committed or logged.

## Verification

- TypeScript and production build checked with synthetic, non-routable configuration, not production credentials.
- Focused Jest tests cover parsing, pagination/rate limits, invitations and gym access.
- Database rehearsal uses PGlite PostgreSQL with synthetic roles, users and two gyms. It checks migration execution, preserved balances, duplicate credits/debits, insufficient funds, ledger consistency, membership isolation, token access, sync locks and workout updates/deletes. PGlite serialises queries: a multi-connection PostgreSQL concurrency/load test is still required in staging.
- Full existing suite has two failures reproduced on untouched base e80cf5182051f6d432d2f21d9f2e51a6a888b004: trust-scoring expected 76 vs 77, and long-workout flag expected flag vs pass. Those unrelated tests/rules are unchanged.

Commands:

    npm ci --ignore-scripts
    npm test -- --runInBand __tests__/whoop __tests__/gym
    npx tsc --noEmit --incremental false

For database rehearsal install @electric-sql/pglite in an isolated directory (not as an app dependency), then:

    PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node __tests__/rewards/database-rehearsal.mjs

## Rollback

Before migration commit, PostgreSQL rolls back the entire migration on failure. After deployment, retain the ledger, redemption and credential records. Reverting the application alone is unsafe because old code reads legacy token columns and overwrites balances from earnings history. Use a reviewed compatibility rollback or forward fix; do not drop accounting tables or restore stale balances.
