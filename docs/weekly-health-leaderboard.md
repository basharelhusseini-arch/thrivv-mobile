# Weekly health leaderboard

## Behavior

Ranks members of the same gym by the sum of complete daily Health Scores from Monday through the current gym-local day, ending Sunday. Maximum 770 per full week: training 560, recovery 140, habits 70. Each daily score is included once. The source table has a primary key on user/date/version; score corrections replace that day's contribution instead of crediting it again.

Incomplete/missing days add nothing yet. Members with at least one complete day are ranked; members with none are pending. Equal totals share competition ranks (1, 2, 2, 4). Returns the top 10 and the current member when outside the top 10. Each row includes scored_days and weekly component sums. Today’s personal score and the seven-day average are unchanged. These totals never credit a redeemable reward balance.

Only the current gym's scores, matching its timezone and health-v3 version, on/after membership and scoring activation dates count. Joining during a week does not backfill earlier unaffiliated days. Future dates and previous weeks do not count. The week rolls over on reads; no cron job, reset write, or deletion is needed. Stored daily history remains intact.

## Files and deployment

- `supabase/migrations/20260912161426_weekly_health_leaderboard.sql`: adds server-only `thrivv_weekly_health_leaderboard(uuid)`; preserves the old daily function and all records.
- `app/api/leaderboard/route.ts`: calls the weekly function with authenticated session identity; returns no-store responses.
- `app/member/dashboard/page.tsx`: weekly headings, period/timezone, component totals and scored-day count.
- `__tests__/weekly-leaderboard/database-rehearsal.mjs`: synthetic totals/boundary/security verification.
- `__tests__/weekly-leaderboard/route.test.ts`: authenticated ownership, no-cache and failure handling.
- This document: operational notes.

Apply the additive SQL to the verified Supabase project before publishing the API/UI commit. No new configuration names or dependencies. Separate production approval remains required for this weekly feature. The Account/gym-code feature was published first as requested, in remote commit caa96f37d851db305d5aab4c89b7b1bb253098fd; its migration was already applied and verified.

## Validation and limitations

Three API tests and the isolated SQL rehearsal passed. SQL scenarios cover total-vs-average ranking, ties, corrections, membership date, activation date, future/previous days, foreign gym/timezone/version exclusion, top ten plus own rank, pending members and UTC/Dubai Monday rollover. Reward balances are unchanged. Test clock substitution occurs only in the rehearsal, never in production SQL. Production build validates the dashboard and API with synthetic environment configuration. No real member data was written for tests; authenticated browser and real multi-member production checks remain outstanding.

## Rollback

Revert the weekly API/UI commit so it calls the retained daily function again. The additive weekly function can remain unused. Dropping it is optional and requires a reviewed database change. No data or balance restoration is required. Do not replay earlier broad migrations on the live database.
