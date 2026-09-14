# Member and gym experience — September 14, 2026

## Scope and implementation

Base inspected: `d37e803` on main. Branch: `codex/member-gym-experience`.

Member Home now presents one eligibility-driven next action, spendable balance and today's credits, compact Health Score progress and the weekly gym leaderboard. Mobile navigation is Home / Workouts / Scan / Rewards / More; desktop uses visible labels and a separate workspace switch. Account contains profile details, preferences, wearables and support; legacy profile/settings routes redirect. Workouts starts with activity and verification, with saved plans secondary. Check-in focuses on workout and habits; optional calorie/sleep tracking is retained without changing score rules. Repeated shortcut grids and unavailable integration advertising were removed.

Rewards renders actual active database offers and retains receipts for previous offers. Each persisted redemption shows its reference, point cost, status and time; pending partner fulfillment is stated explicitly and has a support route. No partner fulfillment or WHOOP conversion was invented or activated.

The gym workspace has Overview, Members, Activity, Invite members, QR display and Support. New server pages and APIs check gym access. Member search is paginated; activity merges manual and WHOOP accepted verification records without skipping same-time rows. Credited points are labelled as the member's daily total, not additional credit per scan. Rejected/repeated attempts were never recorded and are not fabricated. Joining codes and rotating verification codes remain separate. QR display supports automatic opening and fullscreen; rotation, expiry and retry behavior remain.

Sessions are server-backed throughout member pages. Host-only legacy cookies can be shared only across the three canonical Thrivv hosts during an explicit workspace switch. JWT expiry/revocation remain intact. Conflicting duplicate identities fail closed. The server binds each document to its authorized user ID before the first client session check. Account mismatches reload before sensitive children mount; stale requests cannot publish another account after visibility/storage/logout boundaries. Temporary session verification errors are retryable. The shared layout now renders per request to prevent caching an account identity; public content remains available during a session-store outage.

## Reliability and legacy functionality

- Nutrition logs persist through authenticated APIs with exact account checks, sanitized payloads, idempotent imports and deletion tombstones. Existing local history is left untouched and imported only by its signed-in owner. Food logging does not backfill rewards or alter historical scores.
- Nutrition-plan and workout-plan APIs now scope reads/mutations to the server identity. Workout plan lists and detail updates use the same persistent database source. Failed plan persistence no longer reports a successful save.
- Legacy administrative APIs require current administrator authorization. Member passwords are omitted. Actor IDs supplied in headers/body/query cannot grant access to another user's records.
- Sample trainer/booking catalogues and simulated payment confirmations are no longer presented as real operations. Existing browser booking records remain explicitly unconfirmed. Actual scheduling/payment integration requires real gym/provider setup.
- Legacy WHOOP simulator writes are disabled; compatibility reads use safe actual connection data. Production WHOOP OAuth, sync and scoring are preserved.
- Custom habits and workout exercise-progress history still use legacy in-memory storage; custom habits are labelled temporary and separate from reward habits in Daily Check-in. No historical records were deleted.

## Applied production migrations

Only these reviewed migrations were applied to project `ncpcosjwazjbpogugysv`. Files were generated through the CLI and aligned with the versions recorded by Supabase after application.

| Version | Name | Effect |
| --- | --- | --- |
| 20260914131502 | account_nutrition_logs | Add private nutrition entries with duplicate-safe identities and deletion tombstones. |
| 20260914131521 | protect_nutrition_plans | Enable RLS and deny direct client access; preserve server CRUD. |
| 20260914131533 | private_risk_storage | Enable RLS and deny direct client access to risk events/device registry; preserve server grants/data. |

Live read verification: all four affected tables have RLS enabled; anon SELECT and authenticated INSERT denied; server access retained. Service DELETE denied on nutrition entries. Gym/operator/user counts remain 1/1/5; existing `bashar test` gym ID `56e342f6-9799-4947-8c69-9b3de4ba7f3d` preserved. Food entries remained zero immediately after migration; reward entitlements remained one. No gyms/operators, membership assignments, reward activations or historical backfills were created by this work.

PGlite rehearsals verify all records preserved, duplicate imports cannot restore deleted meals, client grants denied despite broad initial defaults, and intended server grants retained. Post-migration security advisors report no RLS-disabled tables. Existing [mutable-search-path function warnings](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) and [Auth password configuration warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) were outside these changes; server-only RLS tables intentionally have no client policies.

## Verification and release status

Final integrated validation: 356 tests across 48 suites passed, TypeScript passed, lint passed, and the optimized Next.js production build passed using synthetic environment values. Account-switch regressions cover both initial hydration and later changes, verifying a full reload for fresh server-rendered data without a reload loop. Release IDs are recorded in the PR and completion message. Automated tests cover session races, account changes, origin/owner checks, gym scope, merged pagination, QR rules, manual versus WHOOP rewards, receipts, nutrition imports and portion arithmetic.

Browser verification was attempted with a standalone synthetic fixture using actual UI components, but the browser blocked localhost with `ERR_BLOCKED_BY_CLIENT`. No visual, real camera, partner fulfillment or authenticated production browser pass is claimed. Vercel project connector access last returned 403; GitHub deployment status is the available release signal.

## Rollback

Revert the application commit if needed. Keep additive nutrition records and security protections; do not drop tables or restore broad client grants. Do not rerun all historical migrations. Nutrition client deployment must follow the new log migration, which has already been applied. No activation flag or score formula rollback is needed.
