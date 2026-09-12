# Account and gym codes

Prepared on branch `feat/member-gym-codes`. Production deployment and migration require separate approval. No production member writes were used in tests.

## Member flow

Account appears in the desktop sidebar and mobile More menu. It shows the signed-in member's database name/email, static masked password, and current gym. Passwords/tokens are never fetched. Profile/password editing is outside this change.

Unassigned members select Join a gym, enter the gym's code, and join immediately. Anyone holding a valid code may join; this does not verify a paid gym subscription or attendance. Existing members see their gym name. Changing gyms requires administrator handling; a code cannot silently replace membership.

The transaction sets `users.gym_id` and the gym-local membership start date. Existing same-day unaffiliated scores with a matching timezone are attached to the gym; earlier scores are not moved. Joining triggers the existing WHOOP sync. If WHOOP is unavailable, membership still succeeds and scoring awaits a later sync. Members without complete scores appear pending. The existing leaderboard already scopes to `users.gym_id`; no new leaderboard source or reward calculation is introduced.

## Gym setup

An existing platform administrator can create a gym through `/admin/gyms`. Each gym card now offers Create / replace gym code; the gym dashboard also has this control for authorized owners. Codes are generated on demand (16 random hexadecimal characters, grouped for typing), shown once, and stored as SHA-256 hashes. Replacing a code invalidates the previous one without removing members. No actual gyms, owner assignments or admin promotions were created by this work. The first platform administrator must be designated separately by an authorized operator; this migration does not promote anyone.

## Exact files

- `components/Sidebar.tsx`: Account navigation and active state on the nested join screen.
- `components/MemberPageHeader.tsx`: Account header styling using the existing shell.
- `app/member/account/page.tsx`: authenticated account details and gym state.
- `app/member/account/join-gym/page.tsx`: code form, errors, success and existing sync integration.
- `app/api/account/route.ts`: minimal authenticated account data for the join page.
- `app/api/account/join-gym/route.ts`: session identity, origin validation and database join RPC.
- `lib/gym-codes.ts`: code generation, normalization and hashing.
- `app/api/gym/[gym_id]/code/route.ts`: authorized code issuance/replacement.
- `components/GymJoinCode.tsx`: owner/admin code control.
- `app/admin/gyms/_components/AdminGymsView.tsx`: code control on existing gym cards.
- `app/gym/[gym_id]/dashboard/_components/GymDashboardView.tsx`: code control on existing gym dashboard.
- `supabase/migrations/20260912155728_member_gym_codes.sql`: reviewed additive schema and atomic join function.
- `__tests__/gym-codes/routes.test.ts`: API identity, permission, credential and input checks.
- `__tests__/gym-codes/database-rehearsal.mjs`: isolated SQL and leaderboard checks.
- `docs/member-gym-codes.md`: delivery and operations notes.

## Migration

Adds `users.is_admin` default false only if absent, `gym_join_codes`, `gym_join_attempts`, and `thrivv_join_gym_code`. RLS is enabled and new tables/RPC are server-only. Direct writes to gym/admin/membership fields are revoked. Table-wide user INSERT/UPDATE grants cause the migration to abort for review rather than exposing those fields.

Five well-formed code attempts are allowed per signed-in user per 15 minutes, enforced in the database. Malformed inputs are rejected before lookup. User-row locking serializes joins; code-row locks coordinate replacement. Invalid attempts return a result instead of raising an exception so the rate-limit counter persists. Existing balances, reward history, scoring formula, WHOOP credentials, authentication, old invitation links and unrelated features are not changed.

This migration depends on the approved live WHOOP storage repair and health tables. The older broad repo migrations have not been applied in full to production and must not be replayed blindly. This file should be applied individually after checking the target reference `ncpcosjwazjbpogugysv`.

No new environment variables or dependencies are required. Existing server Supabase configuration and session secret are reused. No secrets belong in the new client components.

## Validation

TypeScript check; eight focused Jest tests; isolated PGlite rehearsal for valid/invalid joins, retries, cross-gym boundaries, same-day ranking, rate limit/reset, code rotation, racing joins and unchanged balances. PGlite serializes requests, so the rehearsal is not a real multi-connection load test. Production build checked with synthetic environment values. No authenticated browser or real member end-to-end test was performed.

## Rollback

Before deployment, revert the feature commit to remove the UI and routes. After activation, revert app code first; leave additive database structures and member assignments intact to preserve valid joins. Do not drop `users.is_admin` or reverse memberships automatically. Revoke the join RPC from service_role if joins must be stopped immediately, with explicit operator approval. Removing code/attempt tables or reverting individual memberships requires a separate reviewed migration and should preserve an audit of legitimate joins. No balance rollback is needed because this feature never writes rewards.
