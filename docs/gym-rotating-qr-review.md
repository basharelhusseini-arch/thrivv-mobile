> This records the earlier display-only step. See `gym-verified-rewards-flow-review.md` for the complete local implementation and current release gates.

# Rotating gym QR display

Branch: `feat/gym-rotating-qr`. Implementation only; not pushed, deployed or configured in production.

## What is included

An Open QR display / Close QR display control in each existing gym dashboard. The dark-and-gold card contains a high-contrast black-on-white QR with a four-module quiet zone and responsive sizing. The screen clearly says member scanning and points conversion are not active yet. The existing joining code remains separate and unchanged.

The private GET endpoint checks the existing custom-session gym permissions on every refresh. Codes are signed with a dedicated server-only key, identify the gym and issuing operator, rotate on 30-second server-time boundaries and expire 60 seconds after issuance. Codes from adjacent slots overlap for up to 30 seconds. A newly opened display may have less than 60 seconds left in the current slot. Responses are private/no-store; SVGs are generated locally, not sent to an external QR service or image optimizer.

The display uses elapsed monotonic time and conservatively subtracts request duration, avoiding reliance on the device wall clock. It hides codes on tab visibility changes, close/unmount, expiry or refresh failure. Network attempts time out after 10 seconds and retry at a bounded five-second interval. Existing codes may remain valid for at most their signed lifetime after an operator loses access; further issuance is denied. Future scan validation must additionally recheck the issuing operator's current access.

The QR encodes `thrivv-workout:` followed by a signed token. It is not a public website link. The future member scanner must validate signature, audience, purpose, gym, expiry, current operator permissions, member membership, workout eligibility and atomic duplicate protection. The included signature verifier does not verify attendance and does not award points. Short-lived codes do not prevent live sharing.

## Configuration

Set `GYM_WORKOUT_QR_SECRET` server-side to the canonical base64 encoding of 32 cryptographically random bytes. Do not use a NEXT_PUBLIC prefix, reuse a login/WHOOP key, or commit/log the value. Missing/malformed configuration gives an honest setup-unavailable state. Changing this key invalidates outstanding codes. No database migration or scheduled job is needed for this display-only implementation.

## Exact files

- `lib/gym-workout-qr.ts`: purpose-scoped signing, expiry and signature-validation contract.
- `app/api/gym/[gym_id]/workout-qr/route.ts`: gym-authorised, uncached local SVG generation.
- `components/GymWorkoutQr.tsx`: display controls, rotation, expiry and recovery states.
- `app/gym/[gym_id]/dashboard/_components/GymDashboardView.tsx`: two-line integration into the existing dashboard.
- `package.json`, `package-lock.json`: pinned `qrcode@1.5.4` and `@types/qrcode@1.5.5`, required transitive packages; no existing package versions upgraded.
- `__tests__/gym-workout-qr/token.test.ts`: slot rotation, exact expiry boundary, wrong gym, future token, tampering and missing key.
- `__tests__/gym-workout-qr/route.test.ts`: denied access, current permissions/revocation, SVG generation, cache control and unavailable configuration.
- `docs/gym-rotating-qr-review.md`: this review.

QR rendering API reference: https://github.com/soldair/node-qrcode#api

## Validation and limits

57 focused QR and existing gym/access/routing tests passed. TypeScript passed. Production build result is recorded in the delivery message. The generated SVG and token behavior were tested; camera decoding and visual/browser timing checks are not yet verified. The browser daemon failed to start in this workspace during the preceding implementation. No real gym records, member data or production environment variables were changed.

Health Insights, scanner UI, verification storage, rewards, scoring, OAuth and member navigation remain unchanged. No gym/operator accounts are created. The QR cannot be displayed live until the server key is configured and this change is published, both requiring separate approval.

## Rollback

Revert this task's application commit to remove the display and endpoint. Remove the dedicated QR secret if no longer needed. There are no database changes to undo. Preserve existing gym joining codes and permissions.
