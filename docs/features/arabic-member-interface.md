# Arabic member interface

Adds an English / العربية switch to the member shell and member authentication screens. The preference is stored in a one-year, same-site cookie on this browser/device. Server-rendered pages read the same cookie; changing language refreshes server components while preserving client form state.

## Scope

Primary member navigation, authentication, dashboard/Journey and its daily encouragements, rewards, account/preferences, gym joining, bookings, check-in, habits, notifications, health overview, nutrition overview, workout logging/history, wearables and support interface use a shared Arabic dictionary with English fallback. Dates use the selected locale. The document language/direction and logical spacing support right-to-left layouts; email/password fields and voucher codes keep left-to-right direction.

Partner names, member-authored text, support messages, workout/recipe/exercise content and generated plans remain in their original language. Gym/admin, marketing/legal pages and detailed content views are not fully localized in this release. Preference is device-specific, not synchronized between accounts/devices.

No database migration, new dependency or external translation service is required. Add new interface translations in lib/i18n/ar.json and call t at the rendering site; preserve interpolation placeholders and do not translate identifiers or API payloads.

## Verification

- Production Next.js build passed with placeholder build credentials.
- TypeScript and scoped ESLint passed.
- Regression suite: 81 suites, 716 tests passed.
- Tests cover cookie validation, locale switching/document direction, interpolation and prototype safety, dictionary placeholders, all daily encouragements, Arabic Journey rendering and unchanged action destinations.
- Live authenticated mobile/desktop visual RTL verification is still pending. Review Arabic layout and translation quality before production rollout.
