# Gym portal implementation review

## Result

One existing app, one existing login mechanism, one existing gym dashboard. Homepage/footer gym links now lead to `/gym`; production middleware sends that path to the gym hostname. The gym host root also leads to `/gym`, not the platform-admin page.

Signed-out users receive gym login wording and a narrowly validated return path. After login, platform admins reach `/admin/gyms`, operators with one assignment reach that gym, multiple assignments receive a selector, and unassigned accounts receive an access message. Member login without gym context still leads to `/member/dashboard`. Direct dashboard and admin entry preserve their safe return paths. Permissions are checked again at the destination.

The header shows gym name, joining code, copy/replacement controls, total members, active members, points accumulated and verified scans. Existing engagement/retention sections remain. Recent activity contains names/dates and check-in events, not email addresses or nutrition/sleep detail. Existing font and dark/gold classes are reused.

## Metrics and boundaries

- Total members: current `users.gym_id` assignments. Reads are paginated; Supabase row limits do not silently truncate totals.
- Active members: distinct current members with a daily check-in in the last seven UTC calendar days, including today. Check-ins before membership_start_date or in the future are excluded. This is check-in activity, not app page views, logins or attendance.
- Unknown membership dates: members remain in total counts, but historical activity is excluded with a visible explanation. Date-based membership cannot distinguish activity before/after a transfer on the same day. Exact transfer-time analytics needs membership history and is outside this scope.
- Accumulated points: explicitly “Not activated.” The unmerged daily-rewards branch and connected database do not supply immutable gym-attributed earnings. No balances or Health Scores are used as substitutes. A later approved integration must attribute each award to the gym at earning time, retain that attribution on corrections, exclude spending, and choose a forward-only start date for unattributed history.
- Scans: explicitly “Not activated.” No rotating workout-verification implementation/records are available. A later approved integration must count unique accepted member/workout verifications, including total and last seven days; never use daily check-ins as scans.
- These two cards are intentionally disabled integrations in this version, not runtime guesses about table names. Activating a rewards table alone will not activate their dashboard totals.
- Database failures show an unavailable/retry state instead of fabricated zeros. A successful empty member/check-in query shows zero.

## Exact code files

- `app/page.tsx`: replace both email CTAs with gym portal links.
- `middleware.ts`: gym hostname root goes to `/gym`.
- `lib/gym-routing.ts` (new): pure gym-context and allowlisted return/destination rules.
- `app/gym/page.tsx` (new): protected portal resolver and gym selector.
- `app/member/login/page.tsx`: gym wording and safe return after the unchanged authentication request.
- `lib/gym-auth.ts`: protected operator IDs replace owner-email authorization; current account/permissions checked server-side.
- `app/admin/gyms/page.tsx`: gym login return.
- `app/admin/gyms/_components/AdminGymsView.tsx`: administrator-only operator assignment/revocation UI, using verified registered account UUIDs.
- `app/api/admin/gyms/[gym_id]/operators/route.ts` (new): permission list and origin-protected administrative changes.
- `app/gym/[gym_id]/dashboard/page.tsx`: safe login return, direct shared data loading and retry state.
- `lib/gym-dashboard-data.ts` (new): one server data loader shared by page/API; avoids self-HTTP calls with forwarded session cookies. Added during implementation to keep authorization and metrics consistent.
- `app/api/gym/[gym_id]/analytics/route.ts`: authorised, uncached analytics/error responses.
- `lib/gym-analytics.ts`: exclude activity before known membership starts.
- `app/gym/[gym_id]/dashboard/_components/GymHeader.tsx`: gym name, joining code and four primary cards.
- `app/gym/[gym_id]/dashboard/_components/GymDashboardView.tsx`: metric contracts, definitions and membership-date caveat.
- `app/gym/[gym_id]/dashboard/_components/RecentActivityFeed.tsx`: minimal check-in description without health details.
- `components/GymJoinCode.tsx`: persistent code read, copying, legacy/missing/error states and explicit replacement confirmation.
- `app/api/gym/[gym_id]/code/route.ts`: authorised uncached reads and encrypted generation; encryption must succeed before any stored code changes.
- `lib/gym-code-encryption.ts` (new): AES-256-GCM with fresh nonce, gym-bound authenticated data, stored hash cross-check and strict key validation.

No package changes or new dependencies. Existing Node crypto handles encryption. Authentication API, member navigation, nutrition, recipes, workout generation, WHOOP, scoring, leaderboard and reward calculation files are unchanged.

## Migration — NOT APPLIED

`supabase/migrations/20260912174953_gym_portal_access_and_codes.sql`

Prerequisite: the existing gym/member/join-code schema audited on `ncpcosjwazjbpogugysv`. Apply only this reviewed migration after separate production approval; do not replay older migrations. This branch starts from the same file tree as GitHub main's food-browser commit, without pulling in unmerged daily-reward changes.

Adds `gym_operators(gym_id,user_id,assigned_by,assigned_at)` with a composite primary key, user lookup index, RLS and no public/client grants. Adds nullable `code_ciphertext` and `code_encryption_version` to `gym_join_codes`, with an envelope consistency constraint and restricted grants. Adds the service-only `thrivv_set_gym_operator` RPC, which verifies the actor is a platform admin inside its transaction.

No automatic owner-email backfill, no gyms/users created, no code regeneration, no reward updates. The audited project had zero gyms. Before deploying to an environment with existing gyms, a platform administrator must explicitly assign the intended operators; email-only owners lose access until assigned. All gym endpoints already using checkGymAccess now use this protected identity check, including code and invitation endpoints.

Legacy hash-only codes continue working for joining. Their original text cannot be recovered. The dashboard explains this and offers explicit replacement, warning that the old code stops working. New/replaced codes retain hash validation and store only authenticated ciphertext for later authorised display. Changing the encryption key without re-encryption makes saved code display fail; joining by hash remains intact.

## Configuration and setup — separate approval required

- New `GYM_CODE_ENCRYPTION_KEY`: base64 encoding of exactly 32 random bytes, server only. Store through the approved deployment secret manager. Do not prefix NEXT_PUBLIC, put it in source control, or log its value. Retain it securely for recovery.
- Existing `NEXT_PUBLIC_APP_HOSTNAME` and `NEXT_PUBLIC_GYM_HOSTNAME`: default `thrivv.dev` and `gyms.thrivv.dev`. Both hosts need to point to the intended deployment. Hostname configuration is build-time for shared client/middleware usage.
- Existing `COOKIE_DOMAIN`: `.thrivv.dev` shares login across production subdomains if separately configured. Without it, users sign in on the gym hostname independently. Existing cookies may require signing in again after a domain configuration change. No cookie/security settings were changed here.
- Existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`: unchanged. Confirm deployment uses the intended project before applying the migration; the connected project's identity alone does not prove live deployment configuration.

After migration/code deployment approval: sign in as an existing platform admin, create the gym through existing management, verify the operator's registered user UUID and grant that account access. Opening the gym portal then resolves its dashboard. Code generation requires the encryption key. No automatic assignment based on the contact email.

## Validation

- 38 tests passed across 9 suites: gym routing, host redirects/no loops, return-path rejection, operator authorization/revocation, code encryption/tampering/gym binding, code reads and errors, administrative origin/identity checks, paginated counts, membership boundaries, rendered dashboard copy, plus existing session/invitation/member joining routes.
- Isolated PGlite SQL rehearsal passed: migration preserves hashes/balances; original joining works; admin-only assignment/revocation; duplicate submissions; gym boundaries; anon/authenticated cannot read operators/encrypted codes or call the permission RPC. This is not a multi-connection PostgreSQL load test.
- TypeScript and production build passed with synthetic configuration. Existing unrelated dynamic-route build diagnostics were not changed.
- Cloud browser rejected the local preview URL with ERR_BLOCKED_BY_CLIENT. Mobile/tablet/desktop visual checks, clipboard interaction and authenticated end-to-end browser checks remain unverified. Rendered markup tests are not visual verification.
- No production test writes, migration, scheduled-job change, push, merge or deployment performed.

## Rollback

Pause gym access/route entry if needed; keep protected operator authorization in place. Do not revert to email-based authorization as a rollback shortcut. Restore UI separately if needed while preserving the new access checks.

Retain encrypted code records, their key and original hash validation. Never delete/rotate codes as part of rollback. The nullable added columns can remain unused by older code, but do not drop them until secure recovery/retention has been reviewed. Preserve operator assignments for auditing/recovery; schema removal requires its own reviewed migration. Existing balances, member assignments and joining codes are unchanged by the migration.
