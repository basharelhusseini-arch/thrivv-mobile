# Platform administration and support — implementation review

Branch: `feat/platform-admin-support`. This implementation has not been pushed, deployed or applied to production. No live email has been sent, scheduled job activated, gym created or operator assigned.

## Resulting experience

The existing `/admin/gyms` workspace now has Overview, Gyms, Access requests, Members, Support and Audit history tabs. Platform administration uses the existing protected `users.is_admin` role and custom JWT session, not an email comparison. The previously approved administrator account retains its regular member dashboard and can switch through its Platform Admin link. This migration does not promote any accounts.

Administrators can create/edit gyms, open their existing dashboards and joining-code control, inspect registered applicants, approve an applicant for a selected gym, explicitly grant/revoke gym access, search members, inspect recent scores/rewards and sync status, correct memberships and request a locked current-day WHOOP sync retry. Privileged mutations record actor, reason, timestamp and safe before/after values atomically. Membership changes additionally record forward-only history. No original score or reward history is rewritten by a membership correction.

Members and gym owners can submit private support requests and follow a conversation in the app. Administrators read, reply and resolve requests; requester replies reopen a resolved request. Each new request has a notification adapter addressed to `basharelhusseini@gmail.com`. The email includes only a ticket reference and protected inbox link, not the message body, member email or health data. In-app replies are authoritative; replying directly to an email does not update a ticket. Notifications of subsequent replies are not included in this version.

## Database migration

Review `supabase/migrations/20260913020438_platform_admin_support.sql` before applying it. It depends on the already-existing gym access/code migration and current users, gyms, check-ins and WHOOP connection tables. It creates six tables: `gym_access_requests`, `admin_audit_events`, `gym_membership_history`, `admin_support_actions`, `support_tickets`, `support_messages`; six service-only API functions plus a membership-history trigger function. RLS is enabled and all default client/service grants are reset before applying the minimum service grants. Audit and conversation records have no service UPDATE/DELETE grant. Ownership and current admin checks use application user IDs explicitly; they do not assume `auth.uid()` matches custom JWT users.

There are no balance backfills, account promotions or code rotations. Existing member, score, reward and code records are preserved. Historical audit and membership events cannot be reconstructed and are not fabricated.

## Metric and action definitions

- Registered accounts: all users; gym members: users with a current gym assignment.
- Active gym members: distinct current gym members with a check-in dated in the last seven UTC calendar days, on or after their recorded membership start. This is recorded app activity, not gym attendance.
- Stale sync: connected account with no successful sync timestamp in the last 24 hours; this is not proof of failure.
- Failed support retries: recorded failed support actions in the last seven days, not all historical WHOOP failures.
- Member detail shows the latest 30 score days, latest 30 existing reward-history rows, latest 20 support retries and latest 30 membership changes, labeled with those limits. Lists of gyms, members, tickets, messages, requests and audit events are paginated where used by administration.
- Support retry: existing current-day sync only, existing per-member WHOOP lock, five-minute cooldown and request-ID duplicate protection. The client cannot override date or submit score/reward values. A crash before outcome persistence leaves an honest running/unknown outcome that the next eligible retry marks interrupted.
- Ticket limits: five new tickets per day and 30 messages per hour per account. Notification delivery is separate from ticket persistence. Atomic claims and stable provider idempotency keys prevent concurrent sends; at most three attempts inside a conservative 23-hour window. Older ambiguous attempts stop with an unknown status.

## Configuration and activation

Existing configuration remains required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`; existing shared-domain login settings including `COOKIE_DOMAIN` as appropriate.

Joining-code recovery still requires the previously outstanding server-only `GYM_CODE_ENCRYPTION_KEY`; hash-only legacy codes cannot be recovered. No existing code is rotated automatically.

Email proposal: Resend's server-side email API, with `SUPPORT_EMAIL_ENABLED`, `RESEND_API_KEY`, `SUPPORT_EMAIL_FROM`. Default is off, even if provider credentials exist. Provider choice, verified sender domain, plan/cost and production activation require separate approval. No provider subscription was created; this feature makes zero email-provider calls while disabled. Exact sending charges must be checked against the selected plan before activation.

## Tests and verification

- 77 focused Jest tests passed across administration/support, gym routing/access/code handling and existing WHOOP tests (16 suites in separate focused runs).
- In-memory PGlite rehearsal passed with synthetic users and gyms: denied nonadmin operations, duplicate approval/reply handling, atomic audits, grant/revoke, membership history, private ticket ownership, status rules, cooldown, metric counts, preserved decimal balances/codes, append-only audit permissions and denied anon/authenticated grants. The rehearsal includes broad default service grants to verify the migration explicitly removes them. PGlite does not establish true multi-connection load behavior.
- TypeScript `tsc --noEmit` passed.
- Production build passed with synthetic configuration only. Existing GymJoinCode hook warning and stale Browserslist warning remain; dependencies were not upgraded.
- Extracted `syncDaily` function body matches its previous implementation exactly; existing WHOOP tests pass.
- `git diff --check` passed. Final paths are scoped to administration, support, necessary routing/auth flags and sync reuse. Existing untracked `supabase/.temp/` is preserved and excluded.
- Browser verification was attempted using agent-browser, including debug retry, but its daemon exited during startup. Mobile/tablet/desktop visual and authenticated browser end-to-end checks remain unverified. No live member data was used for test writes and no provider email was sent.

## Remaining limitations

Reward accounting and auditable points adjustments stay explicitly unavailable, as agreed, because the inspected database lacks the reward redemption structures expected by existing code. This does not change existing score/reward formulas or leaderboard rules. QR verification is not implemented or activated by this work. The existing gym dashboard retains honest availability states for missing sources.

The full new flow requires separate approval to apply this migration and publish the branch, followed by an authorized end-to-end check with a test account. Current deployed configuration, email delivery and live dashboard operation are not proven by local tests.

## Rollback

Before migration, take an authorized database backup and review dependencies on an isolated copy. Apply this one migration only; do not execute unrelated pending migrations. For an application rollback, restore the previous application commit and disable email using `SUPPORT_EMAIL_ENABLED`. Preserve the additive tables and audit/history records; dropping them destroys new support and audit data. Do not roll back to an older unaudited mutation endpoint without disabling management writes during the rollback. User-requested membership/access edits are real business changes: reverse individually with a reason through audited operations; do not bulk restore old assignments or balances. The original score/reward formulas and WHOOP OAuth behavior are unchanged.

## Exact changed files

| File | Purpose |
| --- | --- |
| `__tests__/gym-portal/navigation.test.tsx` | Isolated permissions, privacy, idempotency, sync and regression checks. |
| `__tests__/gym-portal/routes.test.ts` | Isolated permissions, privacy, idempotency, sync and regression checks. |
| `__tests__/platform-admin/api.test.ts` | Isolated permissions, privacy, idempotency, sync and regression checks. |
| `__tests__/platform-admin/database-rehearsal.mjs` | Isolated permissions, privacy, idempotency, sync and regression checks. |
| `__tests__/platform-admin/email.test.ts` | Isolated permissions, privacy, idempotency, sync and regression checks. |
| `__tests__/platform-admin/sync.test.ts` | Isolated permissions, privacy, idempotency, sync and regression checks. |
| `app/admin/gyms/_components/AdminGymsView.tsx` | Expand existing workspace with overview, gyms, requests, members, support and audit tabs. |
| `app/api/admin/access-requests/route.ts` | Platform-admin-only analytics or audited management/support action. |
| `app/api/admin/audit/route.ts` | Platform-admin-only analytics or audited management/support action. |
| `app/api/admin/gyms/[gym_id]/assign/route.ts` | Platform-admin-only analytics or audited management/support action. |
| `app/api/admin/gyms/[gym_id]/operators/route.ts` | Platform-admin-only analytics or audited management/support action. |
| `app/api/admin/gyms/[gym_id]/route.ts` | Platform-admin-only analytics or audited management/support action. |
| `app/api/admin/gyms/route.ts` | Platform-admin-only analytics or audited management/support action. |
| `app/api/admin/members/[user_id]/sync/route.ts` | Platform-admin-only analytics or audited management/support action. |
| `app/api/admin/members/route.ts` | Platform-admin-only analytics or audited management/support action. |
| `app/api/admin/overview/route.ts` | Platform-admin-only analytics or audited management/support action. |
| `app/api/admin/support/[ticket_id]/notify/route.ts` | Platform-admin-only analytics or audited management/support action. |
| `app/api/auth/me/route.ts` | Return current database-backed admin flag for navigation; no-store response. |
| `app/api/gym/access-requests/route.ts` | Authenticated applicant request submission and own request status. |
| `app/api/support/tickets/[ticket_id]/route.ts` | Private ticket creation, reading and replies with server-side ownership checks. |
| `app/api/support/tickets/route.ts` | Private ticket creation, reading and replies with server-side ownership checks. |
| `app/api/whoop/sync/route.ts` | Extract unchanged current-day sync function for reuse by protected support retries. |
| `app/gym/page.tsx` | Offer access requests and support to unassigned accounts. |
| `app/gym/support/page.tsx` | Authenticated support screen in each existing portal. |
| `app/member/account/page.tsx` | Add support and role-controlled administration links. |
| `app/member/account/support/page.tsx` | Authenticated support screen in each existing portal. |
| `components/GymAccessRequest.tsx` | Owner access request form and request status. |
| `components/Sidebar.tsx` | Add support and server-verified admin navigation without duplicate admin links. |
| `components/SupportInbox.tsx` | Shared private conversation UI, reply/status controls and honest email states. |
| `lib/admin/data.ts` | Shared private API validation and explicitly selected member data. |
| `lib/admin/http.ts` | Shared private API validation and explicitly selected member data. |
| `lib/gym-auth.ts` | Distinguish unavailable authorization storage from denied access. |
| `lib/gym-routing.ts` | Allow validated internal return to gym support. |
| `lib/support-email.ts` | Disabled, minimal-data notification adapter with coordinated retries. |
| `lib/whoop/sync-daily.ts` | Extract unchanged current-day sync function for reuse by protected support retries. |
| `middleware.ts` | Allow private support API on both hosts, preserving same-origin cookies. |
| `supabase/migrations/20260913020438_platform_admin_support.sql` | Add protected requests, support conversations, audit/history tables and transactional functions. |
| `__tests__/platform-admin/session.test.ts` | Verify member sessions survive unavailable role lookup; current role controls admin navigation. |
| `docs/platform-admin-support-review.md` | This review and activation/rollback record. |
