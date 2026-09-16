# Account recovery and workout management

## Hosted Auth setup

- Supabase project: `ncpcosjwazjbpogugysv`.
- In Authentication > URL Configuration, allow the exact redirect URL
  `https://www.thrivv.dev/member/reset-password` and use the live Thrivv origin
  as the Site URL. Recovery always targets this fixed production URL, including
  when requested from the gym hostname.
- Keep the Reset Password email template's Supabase confirmation link. Auth
  consumes its one-time email token and redirects with `type=recovery` and an
  access token in the fragment. A custom PKCE/token-hash template needs a separate
  implementation and is not supported by these pages.
- Configure and verify an appropriate SMTP sender and Auth email rate limits.
  The default hosted mail service is restricted and is not a production delivery
  guarantee. The connected management tools do not expose SMTP or redirect
  settings, so this change does not assert those settings have been verified.
- Do not log reset links, access tokens, refresh tokens, or passwords.

References: [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[password recovery](https://supabase.com/docs/guides/auth/passwords),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Recovery behavior

The forgot-password endpoint accepts only same-origin JSON and returns the same
conditional message for known and unknown accounts and account-specific email
cooldowns. Supabase enforces its configured email rate limits.

The reset page strips query and fragment credentials immediately. Only the access
token is retained in memory, never the refresh token. Both validation and password
update verify the exact token through Supabase Auth and the existing
`thrivv_session_valid` RPC. No refresh, app login, or service-role password override
is performed. The existing password-change trigger invalidates older app sessions.
After an update the handler requests global upstream sign-out and clears Thrivv
cookies. A sign-out outage is shown as a warning without incorrectly reporting
that the already-completed password change failed.

## Deletion and privacy

Logged workouts and training plans have confirmation dialogs. Deletes retain
ownership filters and check the displayed account identity. Plan deletion cascades
to its included workouts and progress, not independently logged workouts or reward
records. No permission grants or database migrations were added for these controls.

Signup requires an unchecked privacy acknowledgement in both the app form and API.
Policy version and server receipt time are included in Auth signup metadata. This
metadata is not an immutable audit record or an authorization claim. Direct calls
to the public Supabase signup endpoint are outside the app API enforcement; a
provider Auth hook would be needed for universal provider-side enforcement. Policy
acknowledgement does not opt a member into marketing or connect wearables.

## Release verification

- Run the full Jest suite, web typecheck and production build.
- Run native navigation tests and native typecheck for the external policy link.
- Check forgot/reset and signup in a browser, including mobile-width layout,
  unchecked agreement, invalid-link state, and policy opening without losing form
  data.
- With an authorized disposable test account and human-entered password, request
  a real reset email, open it on another device, check mismatched confirmation,
  submit the new password, and verify new sign-in succeeds and old sign-in fails.
- Confirm the used link and old signed-in session no longer work. Check a fresh
  email link still works afterward. Never use a real member account for destructive
  testing without explicit permission.
- Using disposable workout records, check Cancel, deletion, refresh persistence,
  empty state, and refusal to delete another member's records. Separately logged
  workouts and rewards should survive plan deletion.

Automated tests use mocked Auth/database boundaries. Real email delivery, account
password changes, and destructive production deletes are not covered by that
automated verification.
