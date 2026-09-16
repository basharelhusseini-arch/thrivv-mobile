# Central app session invalidation — approval required

Prepared separately from the released dependency and persistence fixes. **Not applied or deployed.** Automatic approval review rejected authentication-schema changes as having a wider potential effect than the approved legacy-table cleanup.

The proposal connects Thrivv's existing seven-day cookie to Supabase's account/session lifecycle:

- New cookies include the verified upstream session ID; no credentials are returned to clients.
- A service-only SECURITY INVOKER function checks that the account is not banned, the upstream session still exists and has not expired, and no password change occurred after the app cookie was issued.
- An auth.users password-change trigger records only user ID and invalidation time in a private public.app_session_security table. It copies no password or hash.
- The service role receives SELECT on auth.users(id,banned_until) and auth.sessions(id,user_id,created_at,not_after), plus auth schema USAGE. It receives no password/token-column access or write access to auth tables.
- Existing valid cookies remain supported while a corresponding earlier upstream session exists. App logout continues using the existing token revocation table. Verification outages remain retryable.

Risk to approve: an error in the trigger or validity check could disrupt password changes or sign-in for this Supabase project. The isolated PostgreSQL rehearsal verifies the trigger under the Supabase auth-admin role, ownership, ban/password/global-signout invalidation, old-cookie compatibility, and denial of password-column reads. It does not mutate real accounts.

Apply the migration before deploying this proposal. Review and approve this change separately; do not merge or apply it as part of the already released legacy permission cleanup.
