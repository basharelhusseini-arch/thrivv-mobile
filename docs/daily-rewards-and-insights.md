# Daily Health Score rewards — implementation review

Health Insights and AI were explicitly deferred. No AI integration, data sharing or Health Insights changes are included.

## Rules

- One complete, verified daily Health Score unit earns one point, capped at 110. Score weights remain training 80, recovery 20, habits 10. Nutrition, confidence and beginner multipliers do not participate.
- Today's score is an estimate, not spendable. A successful import must cover the entire local day; credit occurs only at/after 02:00 the following local day. Incomplete data remains pending, and failed/incomplete refreshes never revoke prior credits.
- Calendar comes from the current gym timezone, otherwise user timezone, otherwise UTC. Entitlements store original timezone and period boundaries. Same-date reinterpretations and overlapping credited periods are held for review, not credited twice. A gym/timezone change may therefore delay a transition-day award.
- Activation date is unset and rewards disabled in the migration. Eligible dates must also meet scoring cutover and membership-start rules. No pre-activation backfill.
- A verified zero-workout day earns its recovery/habit contribution. Habits remain self-reported through the existing check-in, not proof of gym attendance.
- Score corrections create only delta transactions. Downward corrections can make the internal balance negative after spending. Available points show max(balance,0); redemptions are blocked during a deficit and future credits offset it. There is no cash charge.
- Daily awards round to the score's one decimal. Existing numeric balance precision is preserved; UI formats points to at most two decimals. Redemption costs remain numeric. Do not reconstruct balances from old reward_history, which previously allowed client writes.
- Legacy history remains intact. A legacy entry conflicting with a new source date is held for review, regardless of its amount. The new earned counter is explicitly 'Earned since activation', not lifetime earnings.

## Exact files

- `supabase/migrations/20260912165942_daily_health_rewards.sql`: five new tables (config, sources, transactions, offers, redemptions), protection of existing reward_history, opening balance records, verification and catch-up metadata, reconciliation/summary/redemption RPCs and permissions.
- `lib/rewards/ledger.ts`: server-only reconciliation wrapper and bounded historical window selection. Amounts are never arguments.
- `lib/rewards/daily.ts`: pure UI status and formatting helpers.
- `lib/whoop/sync.ts`: after successful ownership-verified imports, reconcile rewards; background sync also rotates historical windows of up to seven days. Existing token/OAuth code and score formula are unchanged.
- `app/api/rewards/points/route.ts`: authenticated, uncached database snapshot of balance, source history, offers, redemption history and daily estimate. Errors return 503 instead of a false zero.
- `app/member/rewards/page.tsx`: replaces obsolete confidence claims with explicit score/estimate/balance/earned cards, deficit explanation, errors and recent credited days. Existing offer cards and redemption flow remain.
- `__tests__/daily-rewards/database-rehearsal.mjs`: synthetic SQL accounting and access verification.
- `__tests__/daily-rewards/routes.test.ts`: authenticated reads, missing database, feature gates, estimation and backfill windows.
- `__tests__/daily-rewards/sync.test.ts`: failed imports, ownership mismatch and score-write failure never call reward crediting.
- This document.

## Deployment and activation — separate approval required

1. Review and apply ONLY the new migration to the verified target project. It assumes the audited missing reward tables, and fails on unexpected duplicate structures. Do not replay `20260911145736_secure_gym_workout_rewards.sql`.
2. Deploy the reviewed code. No new dependencies or AI keys are required.
3. After approval of the actual calendar date, set reward_config.enabled=true and activation_date to that date, and enable server environment `DAILY_HEALTH_REWARDS_ENABLED=true`. Both gates are required. Keep the activation date fixed after awards begin; backdating requires review of legacy overlaps and history.
4. Background processing reuses `WHOOP_BACKGROUND_SYNC_ENABLED=true`, `CRON_SECRET`, and POST `/api/internal/whoop/process`. It processes one due member per invocation; current import plus at most one seven-day historical window. Cursor advances only on successful import/reconciliation. Historical windows rotate so a permanently missing day does not block all later days.
5. No scheduler was created. Configure an authorized scheduler capable of authenticated POST after separate activation approval (for example, Supabase Cron with credentials in Vault). Do not assume Vercel's GET cron invokes this POST route. Scheduler capacity must be sized to membership; at one call/minute the existing one-member worker can attempt at most 60 members/hour, before failures or runtimes. Larger gyms need an explicitly reviewed worker-capacity change.
6. Validate live with an approved test account/date before claiming daily rewards work in production. Failed imports retry on the existing 15-minute next_sync_at policy. Extremely long histories take multiple bounded passes; provider-unavailable history remains pending.
7. No offers are seeded or activated. Points can accrue, but actual redemption options require reviewed active reward_offers. Restaurant/partner fulfillment remains outside this change.

Existing configuration names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, existing WHOOP credentials, `WHOOP_BACKGROUND_SYNC_ENABLED`, `CRON_SECRET`. New: `DAILY_HEALTH_REWARDS_ENABLED` (default off). No secret values are included.

## Validation and limits

- SQL rehearsal in isolated PGlite: opening balances including fractions/nulls; disabled activation; 02:00 cutoff; 43.5 credit; repeated/concurrent submitted calls; delta corrections; incomplete refresh preservation; rest days; current/pre-activation exclusion; decimal redemption and idempotency; post-spend deficits and future offsets; legacy conflict holds; invalid-score rollback; timezone and DST boundaries; membership cutoff; anonymous/authenticated permission denial; ledger sums matching balances.
- PGlite serializes calls on one engine. This verifies repeat/concurrent submissions, but is not a multi-connection PostgreSQL load test. SQL uses a member row lock shared by crediting and redemption, plus a primary key on member/date, to enforce concurrency invariants.
- Focused Jest route/sync tests plus existing WHOOP parsing/API tests; TypeScript; production build with synthetic configuration.
- Mobile/desktop visual and authenticated browser checks remain unverified: the available cloud browser blocks local preview addresses. A public deployment was not used for test writes.
- No production member data was written. No live reward activation, migrations, scheduler changes, pushes or deployment were performed for this change.

## Rollback

Disable DAILY_HEALTH_REWARDS_ENABLED and reward_config.enabled to pause new accrual; separately pause the scheduler if required. Keep ledger and redemption tables/functions for existing balances and outstanding redemptions. Do not delete credited transactions or restore an old balance over newer redemptions. Reverting the UI is possible but restores misleading old labels; leave the database intact. Schema cleanup requires a separate migration, and opening/null-balance normalization is not losslessly reversible without a prior snapshot. Any reversal of real awards must be an audited adjustment.
