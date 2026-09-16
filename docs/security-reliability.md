# Security and reliability release — September 2026

This release preserves the member and gym interface while addressing the dependency, access-control, authentication and persistence findings from the audit.

## Changes

- Next.js 14.2.35 → patched 15.5.25, with its matching lint package and async request APIs. React stays on 18.3.1. The two affected client pages use useParams, preserving React 18 compatibility.
- Supabase JS 2.116.0; patched transitive web dependencies. Pin PostCSS 8.5.28 under Next to avoid its older vulnerable bundled version.
- Revoke browser-role writes and unused destructive privileges in public tables. Server access and stored rows remain intact. New tables default to private access. Fix the four mutable function search paths.
- Habits, entries and exercise progress use private database tables rather than process-local arrays. API responses retain their existing field names. All operations use the authenticated member and owner-scoped queries; habit entries enforce parent/member ownership and one entry per date.
- Login/signup require same-origin JSON. Successful signup sets the same HttpOnly app cookie as login. Neither endpoint returns access or refresh tokens to the browser; no current client consumes those fields.
- New app cookies bind to the Supabase session. A service-only check reads only identity, expiry and ban metadata; it cannot read credential columns. Password changes invalidate app cookies through an auth trigger. Existing cookies remain valid when their account and earlier upstream session remain active.
- Remove the local setup script's fixed signing-key fallback.
- Native dependency patches preserve Expo SDK 54 and the existing WebView UI. Package updates require a subsequent native build to reach an already installed binary; web changes are delivered through the existing WebView URL.

## Verification

- Full Jest suite, TypeScript and production Next build.
- `__tests__/rewards/security-persistence-rehearsal.mjs`: runs the exact migration in isolated PostgreSQL, checks role restrictions, credential-column denial, owner isolation, actual close/reopen persistence, cascade deletion, password reset, ban, global sign-out, and old-cookie compatibility. No production fixtures.
- `__tests__/security/browser-pages.mjs`: real production Next server, phone/desktop pages, hydration/overflow and unauthenticated guards.
- Gym-portal and manual QR browser rehearsals at 390px and 1440px, including duplicate clicks, replacement confirmation, QR rotation, camera cleanup, point feedback, failure/retry and logout.
- Expo typecheck and iOS JavaScript export; this is not a signed device build or a real-device WHOOP OAuth test.

Prerequisites: PGLITE_MODULE can point at an isolated PGlite installation. Browser scripts accept PLAYWRIGHT_MODULE and CHROMIUM_PATH. Build the existing synthetic browser fixtures as described in gym-portal-repairs.md and manual-gym-rewards.md.

## Rollout

Apply `20260916165046_security_and_persistent_member_records.sql` before deploying the application. Check the live grants, auth validity function and security advisors afterwards. No live offers, discount codes or test members are seeded.

The migration preserves existing database data. Records previously kept only in ephemeral server memory cannot be recovered by a database migration; all newly saved habits and progress are durable.

Release checks: 390 Jest tests passed; production build and TypeScript passed. Both browser rehearsals passed at phone and desktop sizes. The web production dependency audit reports zero vulnerabilities. Native critical/high alerts were removed using compatible patches, including Metro 0.83.8; its iOS export still succeeds. Three moderate advisory entries remain in the Expo Router → query-string → decode-uri-component chain. Resolving that chain requires a separately tested router/SDK migration because its patched decoder changes CommonJS/ES-module semantics; forcing that override would break the current router. No critical/high native advisory remains in the scan. This release does not claim that all third-party code is risk-free.
