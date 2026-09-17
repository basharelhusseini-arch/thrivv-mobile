# In-app account deletion

Location: Member → Account → Delete my account. The native app uses the same page in its WebView. The user enters their current password and types DELETE. Forgotten passwords link to the existing recovery flow. Success clears local Thrivv data/cookies and displays a signed-out confirmation.

## Security and data behavior

- `POST /api/account/delete` requires a valid app session, same-origin JSON, the rendered member ID, explicit confirmation and fresh password verification against Auth's current email. Browser-supplied email or a different member ID cannot select the deletion target.
- Auth rate limits apply to password verification; temporary verification sessions are signed out on failure. No password is logged or stored.
- Server-only readiness RPC prevents deletion when the database cleanup trigger is unavailable. `auth.admin.deleteUser(id, false)` performs a hard delete; the BEFORE DELETE trigger removes public records inside the same Auth transaction. A failed cleanup rolls back the entire deletion.
- Removes the member profile, workouts/plans/progress, nutrition records/plans, recipes, habits, health scores, check-ins, WHOOP connection/tokens/data, rewards, risk/device data, owned support tickets, membership history and gym operator access. Auth identity/session records cascade. Existing central session checks reject every old custom app cookie once Auth deletion commits.
- Other members and gyms remain. Historical staff attribution is set to null; staff replies on other members' support tickets become a neutral placeholder. A matching gym contact email is cleared; administrators can assign a replacement business contact. Consumed discount-code inventory is removed, not made available for reissue.
- WHOOP syncing stops by removing stored credentials. This does not delete the user's WHOOP account or cancel a WHOOP subscription or gym contract.
- A NOT VALID Auth/profile foreign key protects new writes without deleting legacy orphan records. Owner-lock triggers prevent delayed workout/nutrition/risk writes from recreating records for a deleted account.

## Release

1. Apply `supabase/migrations/20260917134339_account_deletion.sql` before deploying the app change. This installs cleanup logic and adjusts six staff-attribution columns; applying the migration itself does not delete member accounts.
2. Deploy the web app. Existing native builds load the same account page; no new Expo dependency or native permission is needed for this feature.
3. With an explicitly approved disposable account, verify current-password rejection, successful deletion, inability to log back in and rejection of an existing session on another device. Do not use a real member account for this check.

Implementation and database tests have not deleted any production accounts. Supabase Storage has no objects in the audited project and the app does not upload member files. If member file uploads are introduced, add Storage API cleanup before deletion; Auth rejects deletion of a Storage-owning user. Backup expiry and historical email copies are outside this synchronous database transaction.

## Verification

- Jest: `npm test -- --runInBand --silent` (includes route identity/origin/password/failure tests and confirmation/cancel/pending UI behavior).
- Typecheck: `npx tsc --noEmit --incremental false`.
- Production build: `npm run build` with build-only placeholder environment variables when real deployment secrets are unavailable.
- Isolated PostgreSQL test (PGlite, no live credentials or data):

```sh
npm install --prefix /tmp/thrivv-deletion-check --no-audit --no-fund @electric-sql/pglite
PGLITE_MODULE=/tmp/thrivv-deletion-check/node_modules/@electric-sql/pglite/dist/index.js node __tests__/account-deletion/database.mjs
```

The fixture is a schema-only snapshot of public table definitions and constraints, with synthetic test members. Tests exercise the Auth-role trigger, failure rollback, another member's records, staff attribution, reward-code inventory, late writes, service-only readiness access and disabled-trigger detection. Auth HTTP integration and mobile visual behavior still require the disposable-account smoke test after release.
