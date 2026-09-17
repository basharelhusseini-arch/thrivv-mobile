# Member experience and reliability

Based on `codex/pilot-scale-readiness` (`3f3f3e6`). The pilot migration must be applied before this migration.

## Member changes

- Every onboarding choice continues to the dashboard. Join gym → scan after training → earn attendance points. WHOOP connects separately in Wearable. Existing attendance rules remain 40 points plus up to 10 habit points.
- Disconnected members see verified visit days (deduplicated across manual and WHOOP scans), verified days in the Monday–Sunday gym-local week, today's recognised habits and days with habit activity this week. Missing data displays as unavailable, not zero. Connected members retain Health Score.
- Saved standalone workout logs can be edited in history. Edits use the existing record, check ownership and validate all movements and weights; no reward or verification fields can change.
- The workout form shows previous recorded weights, excludes the workout being edited, and includes an optional rest timer. Strength progress pages through the complete saved workout log, beyond both the UI page and Supabase's row cap.
- New workout saves enter an account-specific durable browser queue. The UI distinguishes device drafts, waiting uploads and synced workouts. Uploads retry while Thrivv is open and online, on reconnection and every 30 seconds. Each upload retains its request ID, so an uncertain server response cannot create a duplicate. Session changes stop workers; server expected-user checks prevent another account accepting an upload. Authentication and server failures retain pending data; validation conflicts require review.
- Device storage is required for queued saves. Storage failure keeps the form open. Clearing app/browser data clears unsynced workouts. This is not OS-level background upload. Saved-workout edits require a live connection; edit drafts remain locally saved. Attendance scans and redemptions are never queued.

## Operations and telemetry

`/admin/gyms?tab=Overview` now has a paginated prioritised queue: exhausted reward stock, rejected redemptions and recent runtime errors first; paused WHOOP imports next; low stock, open support and access requests follow. Existing audited actions handle resolution. The queue refreshes every minute while visible and issues leave automatically when source records are resolved. Runtime errors age out of the active queue after 24 hours without recurrence.

A protected Vercel cron calls `/api/internal/operations` every five minutes. Email delivery is coalesced into six-hour windows, uses a database lease and provider idempotency key, and retries failed delivery. It sends a generic link to the admin queue, without member or health information. Provider acceptance does not prove inbox delivery.

Before enabling in production, configure:

- `CRON_SECRET` (also used by the existing WHOOP worker).
- `RESEND_API_KEY`.
- `OPERATIONS_EMAIL_FROM` — a verified sender.
- `OPERATIONS_EMAIL_TO` — the operator notification address.

The admin queue explicitly shows when email configuration is missing. This change does not send any test email or configure external credentials.

Next.js server instrumentation, React error boundaries and unhandled browser errors write deduplicated records into the service-only `runtime_errors` table. Shared API error handlers and workout/reward error paths report failures too. Captured fields are source, scrubbed route, error type, occurrence counts and timestamps; no request bodies, tokens, query strings, member IDs or raw messages are stored. Console fingerprints correlate with the queue. Browser reports require a signed-in, same-origin request and are rate limited; anonymous-page errors are not accepted by that endpoint. Production reporting is automatic; `ERROR_REPORTING_ENABLED=true` enables server reporting in a test environment. Records expire after 30 days via the operations cron.

## Release

1. Apply `20260917232708_member_experience_reliability.sql` after the pilot migration.
2. Configure the email values above and verify the sender with the email provider.
3. Deploy the reviewed branch. The migration, cron and error capture are not activated by merely creating this branch.
4. In GitHub branch protection, require the `web` and `ios-bundle` jobs if merges must be blocked on failure. The workflow runs on all pull requests, main pushes and manual dispatch, without production secrets.

CI runs locked installs, existing unit tests, the local database regression suite, lint, type checking, Next.js production build and the Expo iOS bundle export. It does not submit to TestFlight or App Store.

## Validation

Local checks cover upload retries/account isolation, owner-scoped editing, personal bests beyond 500 records, telemetry redaction, migration compilation, member activity totals, priority ordering, alert leases/retries/deduplication and service-only permissions. A synthetic browser fixture exercises actual React components at 390px and 1440px, including offline save/reconnect, edit, timer, previous weights, disconnected dashboard and operations queue. It does not claim an authenticated production backend test.
