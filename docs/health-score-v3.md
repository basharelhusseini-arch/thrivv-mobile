# Health Score and dashboard implementation

Branch: `feat/health-score-dashboard`, based on local `21b9267` (the earlier gym/rewards work). Neither branch has been deployed. This change does not implement the held 1.2x–0.8x reward multiplier.

## Behaviour

- Seven member links: Dashboard, Workouts, Nutrition, Bookings, Health, Rewards, Wearable. Existing Recipes and Habits pages remain; Nutrition already links to Recipes and Health/check-in links to Habits.
- Dashboard ranks total Health Score /110 within the authenticated member's gym. Columns are Training /80, Recovery /20 and Habits /10. Competition ties use the stored one-decimal total. Top ten rows plus the current member are returned; incomplete members are listed separately, without ranks.
- Seven-day averages exclude today and dates before membership. Missing or incompatible scores do not become zero. Coverage is displayed. Calendar calculations use the gym timezone, or unaffiliated member timezone, with UTC as the default.
- Today's Health Score is 0.8 × best individual Workout Score + 0.2 × WHOOP Recovery + 10 × eligible habit completion fraction. Each component is rounded to one decimal before summation. No normalisation to 100. Recovery 90 contributes 18; workout 75 + recovery 90 + all six habits gives 60 + 18 + 10 = 88. Maximum 110.
- Existing six check-in habits form the fixed v3 denominator. Only literal true values for those keys count. Arbitrary client keys do not count. Manual activity/sleep and nutrition remain tracking data, without verified training/recovery points.
- WHOOP workout scoring uses the approved three profiles in `lib/workout-score.ts`. Targets and weights are product assumptions, not validated health guidance. Strain, zones and calories are correlated. Unknown nonempty sport names use cardio/Other; absent required measurements remain pending.
- Elapsed duration includes rests. Energy is kilojoules /4.184; zones are milliseconds /60000. Zone overrun tolerance is max(1 second, 1% elapsed duration). Partial HR recording may leave zone totals below elapsed duration; missing time is not filled in or reweighted.
- Recovery is matched by sleep_id and cycle_id to the local day's non-nap main sleep. Multiple main sleeps on one local day remain pending instead of selecting arbitrarily.
- Sync fetches complete paginated collections before storing anything. Missing/pending measurements cannot overwrite retained valid workout measurements; readiness becomes provisional. Provider updates and deletions within the reconciliation window recompute the daily best. No workout stacking or workout reward credits.
- Health shows recent individual workouts and their scoring breakdowns. Factual dashboard status and last sync replace the old Live badge.
- Check-ins no longer call the legacy reward-credit conversion. Nutrition only stores calories; it does not recompute scores or issue rewards. Existing balances, ledger entries, redemptions and historical health_scores are untouched. New daily credits remain on hold pending the separate reward formula instructions.

## Exact files

Existing files changed:

- `components/Sidebar.tsx`: seven member entries and Wearable label.
- `app/member/dashboard/page.tsx`: current scoring, coverage, gym ranks, components and sync states; existing visual shell retained.
- `app/member/health/page.tsx`: 80/20/10 components, pending state, habits links and individual WHOOP workout explanations.
- `app/member/checkin/page.tsx`: v3 preview uses server-verified inputs; removes old food/manual scoring claims.
- `app/api/checkin/today/route.ts`: authenticated habit whitelist, gym calendar, scoring under existing sync lock, no new reward conversion.
- `app/api/health/update-from-nutrition/route.ts`: nutrition-only write, preserves concurrent habit fields and compatible success/balance response.
- `app/api/health/summary/route.ts`: personal v3 scores/components, recent workouts and relevant explanatory text.
- `app/api/score/today/route.ts`: common snapshot service.
- `app/api/score/history/route.ts`: last seven completed local days and coverage; both scores/history response keys.
- `app/api/leaderboard/route.ts`: server-authenticated, database-scoped ranking RPC.
- `app/api/whoop/sync/route.ts`: retains daily WHOOP ingestion, replaces legacy health-score writes with shared workout/v3 sync.
- `lib/whoop/api.ts`: reusable bounded collection pagination for workouts/sleep/recovery.
- `lib/whoop/workouts.ts`: extracts type, energy and zones; stores score and explanation.
- `lib/whoop/sync.ts`: verified ownership, calendar windows, shared manual/background scoring, successful-sync timestamps only after processing.

New files:

- `lib/workout-score.ts`: deterministic workout profiles and daily-best selection.
- `lib/health-score-v3.ts`: health formula, version and fixed habit eligibility.
- `lib/score-calendar.ts`: timezone boundaries and coverage-aware averages.
- `lib/daily-health-score.ts`: server-owned score context, reads and writes.
- `lib/whoop/recovery-day.ts`: main-sleep/cycle matching.
- `supabase/migrations/20260911153031_health_score_v3.sql`: reviewed additive schema and tenant ranking function.
- `__tests__/health-v3/scoring.test.ts`: formula, data quality, recovery attribution, aggregation and calendar tests.
- `__tests__/health-v3/routes.test.ts`: authenticated identity, habit whitelist and absence of nutrition/reward side effects.
- `__tests__/health-v3/navigation.test.tsx`: rendered navigation and preservation of removed-link destinations.
- `__tests__/health-v3/database-rehearsal.mjs`: isolated PostgreSQL migration, ranking, grants and preservation checks.
- `docs/health-score-v3.md`: this review and operating guide.

No dependencies, lockfiles, authentication code, bookings, workout generation, recipe pages, nutrition pages, deployment configuration, scheduled-job settings or restaurant fulfilment were changed in this commit. The earlier local gym/rewards commit remains a separate dependency.

## Migration and activation

Do not deploy these application changes against an unmigrated database. First verify which Supabase project is actually used by the deployment. The connected project must not be assumed to be production.

Review the prior `20260911145736_secure_gym_workout_rewards.sql` dependency and this new migration against the verified target. Do not replay old numbered migrations blindly. The rehearsal uses synthetic fixtures; it is not proof of compatibility with an uninspected production schema.

The new migration adds timezone fields, workout input/breakdown columns, server-only health_score_days and health_scoring_config tables, blocks direct check-in writes, and replaces the workout persistence function. Existing health_scores, nutrition columns, balances and awards remain intact. Existing workout rows start unverified until re-imported with full inputs. No historical score or balance backfill occurs.

`health_scoring_config.effective_date` is deliberately NULL. Activation requires separate approval of an explicit YYYY-MM-DD date and gym IANA timezones. Set the effective_date for `health-v3` only after this approval. Dates before that cutover cannot be scored by v3. Do not move the date backwards to create historical scores without explicit instruction. Old/new versions do not mix in ranking or averages.

Use existing configuration names only: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_REDIRECT_URI` and `CRON_SECRET`. No values are included here. Vercel invokes the protected background route on the schedule in `vercel.json`.

## Validation and limitations

- TypeScript passed with `npx tsc --noEmit --incremental false`.
- Focused scoring, route, WHOOP and gym tests passed: 51 tests; the additional rendered navigation test passed separately (52 total focused tests).
- Isolated PGlite rehearsal passed both migrations, balance preservation, workout deduplication/update/deletion, ownership, ranks/ties/top-ten/current-member behaviour and anonymous/authenticated write restrictions. PGlite serialises queries; this is not a multi-connection load test.
- The full Jest run retained the same two existing failures in trust-scoring: expected 76 vs actual 77 and long-workout flag vs pass. Those files are unchanged from original main. All other tests in that run passed.
- Production HTTP smoke passed: six protected scoring/check-in/nutrition APIs reject missing sessions with 401; login, dashboard, health, check-in, recipes and habits routes return 200. This checks routing/access gates, not authenticated browser workflows.
- Production build passed with synthetic, non-production configuration. Existing dynamic-render logging during prerender does not prevent the build.
- Browser visual validation remains outstanding: no browser binary was available and its download timed out. Do not claim a desktop/mobile visual pass. Rendered navigation was checked, but is not a substitute for browser testing.
- Real WHOOP OAuth/workout and live database testing remain outstanding. Test in an isolated approved staging environment before production activation.
- Reconciliation covers today plus seven prior local days. Corrections older than that window need an explicitly scoped reconciliation extension; no historical rewards are issued.
- Ambiguous main sleeps stay pending. This conservative policy needs real-account validation for shift workers and travellers.
- No leaderboard privacy opt-out field was present in the inspected schema. Returned data is limited to member names, public ranks and component contributions; own workout details stay in authenticated personal endpoints.
- The Rewards page's separate legacy confidence display is outside this change. The new multiplier/payout design remains held; the new health formula does not issue redeemable credits.

## Rollback

Before activation, rollback the application branch and leave additive tables untouched. After activation, stop background processing first and archive new score data. Roll back the application together with a reviewed restoration of the previous workout RPC if required. Do not drop populated tables or lower balances. Existing balances/redemptions need no reversal because this change issues no credits. Retain the direct-write restrictions; restoring the older permissive grants is not a safe rollback. Re-enabling old check-in reward credit paths is a separate accounting decision, not an automatic rollback step.

Reference checked: [official WHOOP v2 API documentation](https://developer.whoop.com/api/) for workout sport_name, kilojoule, millisecond zones, pagination, and recovery sleep_id/cycle_id relationships. WHOOP inputs describe recorded activity; they do not prove attendance at a particular gym.
