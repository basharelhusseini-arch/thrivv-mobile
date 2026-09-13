# Gym-verified daily rewards — implementation review

Local implementation on `feat/gym-verified-rewards-flow`, building on the unpushed rotating-QR display commit `21dcb88`. No production migration, configuration, scheduled-job activation, push or deployment was performed for this work.

## Resulting flow

1. A currently authorized operator opens Workout QR on their existing gym dashboard. A dedicated signed payload rotates every 30 seconds and expires after 60 seconds. It contains no member health data; rendering is local.
2. The member syncs WHOOP. Imported, ended workouts offer **Scan gym QR to unlock points** in Dashboard, Health and Rewards. The scanner is `/member/scan-workout`.
3. Camera access begins only on a button press. jsQR decodes on-device; camera frames are never uploaded. The camera stops after decoding, when hidden, on cancellation, on processing failure and on unmount. The server receives only the signed payload, workout ID and idempotency request ID.
4. The server checks the actual session, same-origin request, current gym membership, operator authorization, signed QR expiry, imported workout ownership and the two-hour window after workout end. A pending WHOOP score may be verified, but cannot credit an incomplete score.
5. One accepted record is stored per WHOOP workout. The day’s highest eligible workout must have matching gym verification. A smaller verified workout does not unlock a larger unverified workout. Tied highest workouts may use any verified tied workout.
6. A complete eligible Health Score earns the same number of points (43.5 → 43.5; maximum 110 per day). The UI distinguishes estimates, actual credits and spendable balance. Score changes create signed ledger adjustments, never another full entitlement.
7. Existing successful WHOOP sync and habit-save paths reconcile credits through the shared `saveDay` hook. Accounting failure leaves the saved score/accepted scan intact; later successful syncs retry. Existing background infrastructure is reused; no jobs are activated.
8. Health shows workout strain, elapsed duration, sport, calories converted from recorded kilojoules, time in zones 0–5 and the existing score breakdown. Rule-based explanations use actual components, distinguish zero/missing data and avoid urging more intensity when recovery is low. No AI provider receives data.
9. Gym analytics count unique accepted workout verifications and net gym-attributed earnings, excluding spending and opening balances. Admin member inspection includes daily entitlement status and new point transactions.

## Rules and activation decisions

Both server environment flags and database switches default off. Approve these defaults explicitly when approving activation:

- Verification: imported and ended workout, current gym membership covering the workout’s start date, scan within two hours after workout end. The joining code is separate and never verifies exercise.
- Calendar: gym timezone; workouts belong to their start date, even when finishing/scanning after midnight. Members without a gym retain existing Health Scores but cannot earn these gym-verified rewards.
- Eligibility: the existing `complete` Health Score flag means required WHOOP inputs are available, **not** that the calendar day has ended. Credits may appear on that day and be adjusted after later updates. No change to the scoring formula or completeness calculation.
- One entitlement per application user/scoring date across formula versions and gym changes. Current implementation reads `health-v3`; any future formula requires a separate review.
- Conversion: one point per score unit, new daily awards stored to one decimal. Existing balances/opening entries are copied without rounding, including older finer decimal precision. No beginner/consistency multiplier; nutrition contributes zero.
- Activation date: database `effective_date` must be explicitly chosen. No historical backfill is run. Do not choose a past date without a separate reviewed reconciliation. Existing nonzero legacy daily rewards block another daily award for that date.
- Rest days and verified zero workouts remain scored but do not earn a gym-verified award. Recovery and habits contribute to an eligible gym-verified day’s full score.
- Updated strain/score is adjusted normally. A changed workout start/end or gym calendar invalidates the old verification for reward matching and requires review; the scan record is immutable. Deletion/removal of the verified highest workout can reduce the entitlement after a successful complete resync.
- If a downward correction exceeds the available balance, store `review_required`, preserve the balance and block new redemptions. There is **no automatic negative debt or forgiveness**. Final support resolution policy/tooling remains a separate activation decision; the administrator can inspect the hold. Existing general manual points adjustment remains disabled.
- Moving gyms does not move or repay an existing entitlement. Historical membership/calendar conflicts need review, rather than being silently recalculated under the new gym.

## Database migration

Review only: `supabase/migrations/20260913122819_gym_verified_rewards_flow.sql`.

Creates `gym_reward_config`, `gym_workout_verifications`, `daily_reward_entitlements`, `reward_transactions`, empty `reward_offers`, and `reward_redemptions`.

Creates service-only functions `thrivv_verify_gym_workout`, `thrivv_reconcile_gym_reward`, `thrivv_redeem` and `thrivv_gym_reward_metrics`. Credits, adjustments, debits and stored balances change transactionally under a user-row lock. Unique constraints enforce one accepted workout, one user/date entitlement and one user/request redemption. The ledger/verification records are read-only to service clients; writes occur inside the reviewed definer functions.

The migration enables RLS on new structures, removes inherited grants and denies client execution of trusted functions. It revokes direct table and column writes to users, daily check-ins, imported workouts, authoritative score days and legacy reward history. Existing custom-session server routes retain their service-role access. This is necessary because read-only inspection found live legacy write grants on check-in/habit fields; `auth.uid()` is not the application’s identity model. No identities, memberships, tokens or score formulas are rewritten.

The verified live target did not have these new reward tables/functions. Do **not** blindly replay older migration `20260911145736_secure_gym_workout_rewards.sql` or migration 015. Recheck for intervening schema changes before applying this new migration; it intentionally fails if conflicting tables already exist.

## Required configuration names

- `GYM_WORKOUT_QR_SECRET`: dedicated server-only canonical base64 encoding of 32 random bytes. No value was generated, exposed or configured in production.
- `GYM_WORKOUT_VERIFICATION_ENABLED`: default off; must match approved database verification activation.
- `GYM_DAILY_REWARDS_ENABLED`: default off; must match approved database rewards activation/effective date.
- Existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and session configuration remain unchanged.
- Existing `WHOOP_BACKGROUND_SYNC_ENABLED` and `CRON_SECRET` are used by existing background processing. Scheduler deployment/activation requires separate approval. No new cron definition was introduced.
- Existing `GYM_CODE_ENCRYPTION_KEY` relates to joining-code display, **not** the workout QR secret.

No offers are seeded or made redeemable automatically. Partner fulfillment is not implemented by this task.

## Verification and limitations

- 105 focused Jest tests passed across QR signing/expiry/decoding, scan API, status, explanations, gym authorization/routing/analytics, WHOOP imports, scoring, weekly leaderboard and platform administration.
- QR decoding tested using actual generated black/white QR pixels and jsQR, then verified the resulting signed payload.
- Isolated in-memory PostgreSQL rehearsal passed: disabled activation, ownership, current operator, wrong/expired QR, missing/future/deleted/out-of-window workouts, repeated scans, repeated credits, 43.5 exact credit, preserving a 12.345 opening balance, incomplete sync preservation, upward/downward deltas, highest-workout requirement, idempotent redemption, review holds, gym attribution, immutable ledger/scan records, and denied client table/column/function access.
- PGlite serializes queries: this is **not** a real multi-connection concurrency/load test. Production-like concurrent sessions must still be tested in staging.
- TypeScript check and optimized production build passed with synthetic local Supabase configuration. No production member data was used for test writes.
- Existing unrelated warnings remain: GymJoinCode hook dependency, styled-jsx static-render warning and outdated browserslist metadata.
- Two older tests in the broader suite still expect the former daily leaderboard RPC and seven-item sidebar, predating the existing weekly leaderboard and Account/Support links. Those unrelated tests were not rewritten as part of this feature. Current weekly leaderboard/navigation suites passed.
- No working automated browser/camera environment was available for a real device run. Responsive classes, semantic controls and cleanup paths were reviewed; mobile/tablet/desktop visual checks, permission-denial behavior on iOS/Android and a real two-device gym-display/member-scan test remain release gates.
- Existing WHOOP reconciliation covers today and the previous seven days. Long outages or corrections outside that window require explicit recovery/review; this task does not expand WHOOP history ingestion.
- A rotating QR reduces stale-code reuse but cannot conclusively prove attendance or prevent a live code being shared remotely. WHOOP activities are not independently attested proof of gym exercise.
- Live functionality is not claimed. A configured gym, authorized operator, synthetic staging member/workout and approved activation are required for an end-to-end test.

## Rollback

Before activation: revert the feature commits; all new database flags remain false. Existing records and balances are preserved.

After activation: first disable database reward/verification switches and their server flags; separately stop any approved processing if necessary. Preserve all scans, entitlements, ledger entries and redemption records. Do not drop tables or restore an old balance snapshot after spending. Any financial rollback requires reviewed compensating transactions. Keep the tightened client-write permissions; restoring insecure grants is not an acceptable rollback.

## File inventory
- `__tests__/gym-portal/analytics.test.ts`
- `__tests__/gym-workout-qr/decode.test.ts`
- `__tests__/gym-workout-qr/flow-database.mjs`
- `__tests__/gym-workout-qr/insights.test.ts`
- `__tests__/gym-workout-qr/scan-route.test.ts`
- `__tests__/gym-workout-qr/status.test.ts`
- `app/admin/gyms/_components/AdminGymsView.tsx`
- `app/api/health/summary/route.ts`
- `app/api/member/workout-verification/route.ts`
- `app/api/rewards/points/route.ts`
- `app/api/rewards/redeem/route.ts`
- `app/gym/[gym_id]/dashboard/_components/GymDashboardView.tsx`
- `app/gym/[gym_id]/dashboard/_components/GymHeader.tsx`
- `app/member/dashboard/page.tsx`
- `app/member/health/page.tsx`
- `app/member/rewards/page.tsx`
- `app/member/scan-workout/page.tsx`
- `components/GymWorkoutQr.tsx`
- `components/GymWorkoutVerification.tsx`
- `docs/gym-rotating-qr-review.md`
- `docs/gym-verified-rewards-flow-review.md`
- `lib/admin/data.ts`
- `lib/daily-health-score.ts`
- `lib/gym-dashboard-data.ts`
- `lib/gym-reward-status.ts`
- `lib/gym-workout-qr.ts`
- `lib/health-insights.ts`
- `lib/rewards/ledger.ts`
- `lib/whoop/auto-sync.ts`
- `lib/whoop/sync.ts`
- `package-lock.json`
- `package.json`
- `supabase/migrations/20260913122819_gym_verified_rewards_flow.sql`

The branch also includes the earlier rotating-display implementation documented in `gym-rotating-qr-review.md`. Scope review found no edits to nutrition, recipes, workout generation, WHOOP OAuth, authentication, membership rules, health-score formulas or weekly leaderboard calculations. Shared changes are limited to reward reconciliation after score saves, a client sync-completion notification and read-only support/analytics visibility.
