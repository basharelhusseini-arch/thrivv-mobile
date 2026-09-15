# Thrivv for iPhone

An Expo / React Native iPhone app with a dedicated `https://thrivv.dev/mobile`
welcome screen and a persistent WebView for the member product. Signed-in users
open their dashboard directly. The `ThrivvApp/1.0` user-agent suffix controls
presentation only; all authentication and reward decisions stay on the server. Members use the same accounts, workouts,
WHOOP connection, gym QR verification and rewards as on the website.

This directory is the mobile app. The repository root is the separate Next.js
website. Run these commands **from this directory**, alongside `app.json` and
`eas.json`.

## Project identity

| Setting | Value |
| --- | --- |
| Expo owner | `thrivv-technologies` |
| Expo project slug | `thrivv` |
| EAS project ID | `785c8d66-2994-4969-8df7-e12aec4eb598` |
| iOS bundle identifier | `dev.thrivv.app` |
| GitHub repository | `basharelhusseini-arch/thrivv-mobile` |
| Expo GitHub base directory | `thrivv-mobile` |

[Expo project](https://expo.dev/accounts/thrivv-technologies/projects/thrivv)

The owner is the Thrivv Technologies organization. Signing in as `basharhuss`
does not change ownership. Reuse this project instead of creating another one.
Before the first signed build, confirm the bundle identifier with the Apple
Developer team. If an existing Apple app is intended for reuse, its identifier
must match this configuration before building.

## First TestFlight build

Install dependencies, then let Expo guide Apple signing, building and submission:

```bash
npm ci
npx testflight
```

Sign in to the Expo account that can access Thrivv Technologies and the Apple
Developer account when prompted. The command uses the existing linked project
and `production` profile. It creates or reuses the distribution certificate and
provisioning profile, runs a cloud iOS build, and submits the resulting archive
to App Store Connect. Apple processing must finish before the build is available
in TestFlight. External testers require Apple's beta review.

Credentials must stay in Expo's credential manager or your local credential
store. Never put passwords, certificates, private keys or `credentials.json`
into Git. The mobile app does not need the website's database or WHOOP secrets.

For separate build and submission steps:

```bash
npm run build:ios
npm run submit:ios
```

The existing App Store Connect app ID `6812335938` is configured in
`submit.production.ios.ascAppId` for unattended TestFlight uploads. Uploading a
build does not submit the app for public App Store review.

## Install directly on a registered iPhone

For a small private test before TestFlight:

```bash
npx eas-cli@latest device:create
npm run build:ios:preview
```

Register the iPhone, include it in the provisioning profile when prompted, and
open the completed build's installation link on that iPhone. The `preview`
profile is a standalone app; it does not need Metro or Expo Go. Adding another
device requires rebuilding or re-signing the preview with that device included.

## Build profiles

| Profile | Purpose | Apple signing |
| --- | --- | --- |
| `preview` | Direct installation on registered iPhones | Ad hoc distribution |
| `production` | TestFlight and eventual App Store submission | App Store distribution |
| `simulator` | Native compilation and testing in an iOS Simulator | No device signing; cannot install on an iPhone |

EAS manages build numbers remotely and increments each production build. The
`auto` iOS image chooses the environment matching the installed Expo SDK.

The Expo project already links to this GitHub repository. Its **Base directory**
must be `thrivv-mobile`, not `/`. After initial signing setup and the first
successful build, use **Build from GitHub**, select the reviewed branch or commit,
choose iOS, and select `preview` or `production`. A Git push alone does not
generate or submit an iPhone binary.

## Development and verification

```bash
npm run typecheck
npm run lint
node --test lib/__tests__/navigation.test.cjs
npm run check:ios
npx expo-doctor
```

`check:ios` generates the production JavaScript bundle. It does not compile
Xcode code, validate signing, or prove that camera / WHOOP flows work on a phone.
The cloud build and the device checks below are separate requirements.

For local development, `npm start` starts Metro. On a Mac with Xcode installed,
`npm run ios` compiles and opens the native app locally.
The deployed website supplies the member interface, so normal website updates
appear when the app reloads. Changes to native settings or native code need a
new iPhone build.

### Real-device release checks

- Install the signed build and confirm the Thrivv icon, splash and safe areas.
- Sign in, quit and reopen the app, and verify that the account remains signed in.
- Connect WHOOP and complete its callback in the same WebView. Verify sync status.
- Open the gym scanner, grant camera permission, scan an actual current gym QR,
  and verify the normal reward result. Also test denied permission and retry.
- Navigate between member and gym pages; exercise back navigation and external links.
- Disconnect the network, reload, then reconnect and use retry successfully.
- Sign out, then sign in as another member and confirm account separation.

## App experience

The native header centres the Thrivv wordmark without a persistent Back button.
WHOOP login keeps its provider hostname and Done control. First-time members
choose WHOOP, no wearable, or another device. Only WHOOP is connectable today;
other devices use gym QR verification. Actual server connection/workout state
always overrides a manual preference, and reward source locks remain unchanged.
Wearables is available directly in the More menu for later connection.

The website keeps its marketing homepage; native sessions start at `/mobile`.
Deploy the web routes before distributing a native build that loads them.

## Branding and scope

The icon and splash reuse `../public/brand/thrivv-wordmark-gold.svg` without
changing its geometry or 5:1 aspect ratio. The 1024px app icon is opaque, with
the gold mark centered on `#0D0F14`; the splash is a transparent 1280×256 render.

This first iPhone app includes the existing Thrivv web features. Apple Health
and Apple Watch data import require the separate native HealthKit integration;
packaging the website does not enable that connection.

## References

- [Expo TestFlight command](https://docs.expo.dev/build-reference/npx-testflight/)
- [Internal distribution](https://docs.expo.dev/build/internal-distribution/)
- [Build from GitHub](https://docs.expo.dev/build/building-from-github/)
