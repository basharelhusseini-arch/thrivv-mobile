# Pilot readiness: audit and release notes

Base reviewed: `main` at `6fcfd0548ef9c7194db249c1d68f5d6c20eee87a`.
Work branch: `codex/pilot-scale-readiness`.
Remote `main` was fetched again at the end of the review and still matches the reviewed base. The owner approved pushing the tested changes to the feature branch for review. No production migration, deployment, partner setup, member seeding, push notification, or TestFlight submission was performed.

## What stays and what changes

| Area | Keep | Change |
|---|---|---|
| Gym verification | Signed 60-second QR, current operator authorization, member/gym checks, member/day uniqueness | Everyone uses the same attendance scan, including connected WHOOP members. |
| Earning | Immutable transaction history, row locks, current-day checks, legacy-credit review, 50-point daily cap | 40 attendance points plus up to 10 habit points for everyone; WHOOP imports do not add another attendance award. Existing WHOOP-source entitlements are not repriced. |
| Health | Existing WHOOP training/recovery formula and history | Health Score remains separate from attendance earning and leaderboard rank. |
| Leaderboard | Current gym, local calendar, Monday–Sunday window, tied ranks | Rank by credited daily earnings. Spending/refunds/opening balances do not change rank. |
| Rewards | Partner-supplied unique codes, activation confirmation, atomic debit, private receipts | Branch eligibility, location instructions, low-stock alerts, paginated redemption search, merchant-confirmed use/rejection, replacement, refund and audit reference. |
| Operations | Per-member WHOOP import lock, bounded upstream requests | Durable claim leases, three imports per wave, at most 60 claimed per invocation, retry backoff, pause after six attempts, operator visibility and audited requeue. Successful member-triggered sync also clears failure state. |
| Gym reporting | Existing gym permissions and legacy check-in reports | Verified attendance/cohort report and CSV, with deduplicated member-days and issued vs confirmed reward outcomes. |
| Member reminders | Member identity checks and logout cleanup | Saved opt-in preferences, real available-reward reminders, voucher expiry and selected weekly attendance target; device-local notifications in the rebuilt app. |
| Workout log | Existing draft recovery, coaching tips, account isolation, deletion | Variable reps/weight per set, save request idempotency, paginated history, repeat-as-draft and loaded-history strength progress. |
| Navigation | Home, Workouts, Scan, Rewards and useful supporting pages | Hide Bookings and expose Reminders. |

Reward goals / progress-to-next-reward and a first milestone reward were explicitly declined and were not added. No merchants, offers, codes, gym operators or members are seeded by this change.

## Operating the pilot

Use **Admin → Gyms → Overview** for the background sync summary and **Rewards** for redemption operations, partner setup and code inventory. Platform administrators record merchant confirmations received through the existing partner relationship; this release does not pretend that issuance proves use or provide an automated merchant checkout integration.

Create an inactive offer, choose a branch or all branches, record the real participating location and terms, load merchant-supplied codes, and confirm partner approval before activation. The existing category prices remain 400 / 600 / 800 points. Active offers with ten or fewer unassigned codes show a low-stock alert.

For a redemption problem, find the receipt reference, record the merchant's confirmation/ticket reference and reason, and choose the resolution. A replacement assigns another code without another debit. Old codes remain allocated. A refund returns the original point cost exactly once and cancels the receipt. Confirm the merchant invalidated a faulty code before replacing or refunding it. Fulfilled/cancelled receipts are terminal. Expiry is computed from the stored expiry timestamp, so it does not rely on a scheduled status update.

Paused imports are surfaced after six unsuccessful attempts. The admin can queue another attempt after checking the connection. Retry details contain generic failure categories, never access tokens or raw provider responses. Check oldest waiting time against the chosen refresh interval as membership grows; the worker has a bounded throughput, not unlimited capacity.

## Definitions for gym conversations

- The cohort funnel counts **current members who joined during the selected report period**: joined → first verified visit → at least two visit days → first reward issued. These are observed counts, not a causal conversion claim.
- A visit is one accepted QR verification per member per local gym day. Both verification sources are unioned, so using both does not count twice.
- Visit days/member/week uses eligible membership days during the report period, including members with zero visits. Unknown joining dates are disclosed and excluded from this denominator.
- Week-four participation means at least one verified visit on days 22–28 after joining. Only cohorts whose full window ended are eligible. It is not paid membership retention.
- Rewards are attributed to the member's gym at issuance. Older receipts with no stored gym attribution are excluded, rather than assigned retrospectively.
- Start with the standalone Thrivv flow at one branch; no GymNation integration or custom membership system is required by this code.

## Deployment sequence after approval

1. Review and apply only `20260917184334_pilot_scale_readiness.sql` to a staging database that already has the current production schema. The local rehearsal uses the recorded schema snapshot and previous account-deletion migration. Do not replay the entire historical migrations directory blindly.
2. Confirm the production migration ledger and schema match the reviewed base, then apply this forward migration before deploying the web code. Keep QR/reward config gates under operational control. The migration changes no balances, previous entitlements, partners or configuration activation flags on its own.
3. Deploy the web app. Verify a real member in the correct gym can scan, receive one 40-point base award, update habits within 50/day and see the mixed leaderboard. Verify a merchant-issued staging/test code through its actual acceptance process before enabling a real offer.
4. Configure `CRON_SECRET` and a scheduler that calls the WHOOP worker every five minutes. `vercel.json` includes this cadence. Vercel Hobby supports daily cron only; use Pro/Enterprise or an authorized external scheduler for this frequency. No plan change was made here. See [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
5. Build and submit a new native app version through the existing EAS/App Store workflow for device reminders. The web changes can appear in the existing wrapper after web deployment; adding `expo-notifications` requires a new native binary. No TestFlight build was submitted here.
6. Test notification permission denied/granted, expiry timing, notification tap from a closed app, logout cancellation and account switching on a physical device. Local notifications refresh for the next seven days when the app is opened; there is no server push campaign or indefinitely recurring attendance reminder.

Device reminders use fixed, generic copy and trusted HTTPS app origins. They contain no partner codes, identity or health measurements. Available-reward messages are shown in-app; device notifications cover voucher expiry and the weekly attendance check-in. Cross-device preference changes take effect on a device the next time it opens the app.

## Verification

- `npm test -- --runInBand`: **75 suites / 683 tests passed**. Application regression suite, including new authority checks, weights/reps validation, save retries, wallet resilience and native reminder bridge tests.
- `npm run test:pilot:db`: **passed**. Local PostgreSQL/PGlite rehearsal against the existing schema snapshot, then the new forward migration. Covers shared rewards and cap, repeated scans, mixed ranking, spending independence, branch eligibility, replacement/refund idempotency, queue leases/backoff/requeue, report cohorts, opt-in reminders, restricted database roles and deletion cascades.
- `npm run build`: **passed**. Next production build (synthetic configuration, no production credentials).
- `cd thrivv-mobile && npm run typecheck && npm run check:ios`: **passed**. Native TypeScript and iOS bundle export. These do not replace a signed iPhone/TestFlight test.
- `__tests__/gym-workout-qr/manual-browser.mjs`: **passed at 390px and 1440px**. Exercises synthetic camera QR decoding, the check-in gate, credit confirmation, camera cleanup and safe repeated scans.
- `__tests__/pilot/browser.mjs`: **passed at 390px and 1440px, no runtime errors or horizontal overflow**. Synthetic browser interactions at 390px and 1440px. Bundle `fixtures/harness.tsx` with esbuild with `--define:process.env={}` and the existing test aliases for `next/link` and `next/navigation`, compile `app/globals.css` with Tailwind, then pass both generated files to the script. Set `PLAYWRIGHT_MODULE`/`CHROMIUM_PATH` if using externally installed test tooling. Fixture data never reaches application databases.

Production merchant acceptance, live WHOOP credentials, real QR display/camera behavior, scheduler execution and physical iOS notification delivery still require deployment/device verification. No production system was contacted to exercise these changes.
