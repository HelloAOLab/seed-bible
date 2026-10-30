# Seed Bible for iOS and Android

This folder wraps the Seed Bible web app in [Capacitor](https://capacitorjs.com/), which packages a web app as a native iOS or Android app. The native app is a full-screen web view that loads the Seed Bible from files bundled inside the app.

- `capacitor.config.ts` — the app's id, name, and Capacitor settings.
- `android/` — the Android Studio project.
- `ios/` — the Xcode project (Swift Package Manager, no CocoaPods).

## How it differs from the website

The website is rendered on a server for every request (see `server/index.ts`). The apps have no server: they ship one static copy of the page, built by `pnpm build:native` (`vite build --mode native`) into `standalone/dist/native/`. That build:

- **Fills in the page at build time.** The server normally fills placeholders in `index.html` (theme, config, pre-loaded data). `script/lib/nativeShell.ts` fills them with a fresh install's defaults instead, and the build fails if a new placeholder is ever added to `index.html` without a value there.
- **Renders on the device.** With no server-rendered markup to reuse, the app renders from scratch on start, the same path the website takes when it can't trust the server's HTML.
- **Skips the service worker.** The files are already on the device, and iOS can't run one from the app's local address anyway.
- **Serves everything from the app.** Assets are never loaded from the CDN, so the app shell opens offline. Bible text, accounts, and search still come from the same online services the website uses.

Updates to the web app only reach app users when a new app version is released to the stores.

## What you need

- The repo set up as usual (`pnpm install` at the root).
- **Android:** Android Studio, with the Android SDK and JDK 21.
- **iOS:** a Mac with Xcode.

See Capacitor's [environment setup](https://capacitorjs.com/docs/getting-started/environment-setup) for the exact versions Capacitor 8 needs.

## Building and running

Run these from the `mobile/` folder.

Build the web app and copy it into both native projects (run this after every web change):

```bash
pnpm sync
```

Open a native project in its IDE, to run on a simulator or device, or to make a release build:

```bash
pnpm open:android
```

```bash
pnpm open:ios
```

Or build and launch on a connected device or emulator straight from the terminal:

```bash
pnpm run:android
```

```bash
pnpm run:ios
```

## Builds in CI

`.github/workflows/native.yml` builds both apps. The full list of secrets is at the top of that file.

**Pull requests that touch the apps, and every push to `develop`** get check builds, which need no secrets:

- Android: a debug APK that installs on any phone with "install unknown apps" allowed.
- iOS: a Simulator build (`SeedBible-simulator.zip`). Unzip it and drag `App.app` onto a running Simulator. It can't go on a real iPhone, because that needs signing.

**Every push to `main`, or a manual run with "release" ticked** (Actions → Native Apps → Run workflow) gets signed store builds:

- Android: an App Bundle (`.aab`) for Google Play, plus a signed APK.
- iOS: an `.ipa` for App Store Connect.

Each platform needs its signing secrets for this:

- **Android:** `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- **iOS:** `IOS_DISTRIBUTION_CERTIFICATE_BASE64`, `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`. The profile must be an App Store profile for `org.seedbible.app` with Associated Domains turned on.

Until a platform's secrets are set, its release run makes a check build instead and shows a warning. The run still passes.

The builds are attached to the workflow run as artifacts; uploading them to the stores is still manual.

**Version numbers:** the version people see is `packages/seed-bible/package.json`'s version. The build number is the workflow's run number. Both stores refuse an upload whose build number isn't higher than the last one. If the run number ever starts over (for example, the workflow file is renamed), set the `NATIVE_BUILD_NUMBER_OFFSET` repository variable to push the numbers back up.

**iOS signing detail:** a release run doesn't pass the signing settings to `xcodebuild` directly. Settings given that way reach Capacitor's Swift packages too, and those fail the build when handed a provisioning profile. Instead, `scripts/configureIosRelease.mjs` switches only the App target's Release settings to manual signing, inside the CI checkout.

## Links

### Links shared from the app

Inside the app the page's own address is `https://localhost` (Android) or `capacitor://localhost` (iOS), which only exists on that phone. So every link the app hands to someone else — sharing a passage or translation, session invites and their QR codes, playlists, reading plans, customizations, and verse links saved in notes — is rewritten to `https://seedbible.org` with the same path and query. The app build sets `publicOrigin` in the page config, and `toShareableUrl` in `packages/seed-bible/seed-bible/app/publicLinks.ts` does the rewrite. On the website nothing changes.

### Opening seedbible.org links in the app

Tapping a `https://seedbible.org/...` link on a phone with the app installed opens that page in the app instead of the browser, once the setup below is done. `standalone/native.ts` (only in the app build) handles three cases:

- **The app wasn't running:** it starts on the linked page.
- **The app was running:** it reloads at the linked page, so things only read at startup (a session to join, a customization) take effect.
- **A seedbible.org link tapped inside the app** (for example a verse link in a note written on the website): it stays in the app, like any in-app link.

Each platform only lets an app claim a website's links after checking a file on that website that names the app:

1. **iOS (Universal Links).** The app requests `applinks:seedbible.org` in `ios/App/App/App.entitlements`. Turn on the Associated Domains capability for `org.seedbible.app` in the Apple Developer account, and set `APPLE_TEAM_ID` on the website server, which then serves `/.well-known/apple-app-site-association`.
2. **Android (App Links).** `android/app/src/main/AndroidManifest.xml` claims `https://seedbible.org` with `autoVerify`. Set `ANDROID_CERT_FINGERPRINTS` on the website server to the SHA-256 fingerprint of the key the store build is signed with (with Play App Signing, Google's key, under Setup → App signing in the Play Console; add the upload or debug key too to test local builds). The server then serves `/.well-known/assetlinks.json`.

Both variables are described in `server/README.md`. Until they're set, links keep opening in the browser; nothing breaks.

To check it works:

- iOS: on a device with the app installed, long-press a seedbible.org link in Notes or Messages; "Open in Seed Bible" should be offered.
- Android: run `adb shell pm get-app-links org.seedbible.app`. `seedbible.org` should show `verified`.

Two limits:

- Only `seedbible.org` is claimed, not `www.seedbible.org` or other subdomains.
- Branch deployments (`/b/...`) stay in the browser on iOS. Android can't exclude a path, so there they open in the app, which shows its not-found page.

## Before the first store release

These are left as placeholders on purpose; each needs a decision or an account.

- **App id.** `org.seedbible.app` is set in `capacitor.config.ts`, `android/app/build.gradle`, and the Xcode project. The stores never let an app change its id after it is first published, so confirm it first.
- **Icons and splash screens.** The projects still have Capacitor's default icons. Put a 1024×1024 `icon.png` (and optionally `splash.png`) in `mobile/assets/`, then generate every size with `npx @capacitor/assets generate`.
- **Version numbers.** CI sets them (see [Builds in CI](#builds-in-ci)). Local builds default to 1.0 (build 1).
- **Link verification.** Set `APPLE_TEAM_ID` and `ANDROID_CERT_FINGERPRINTS` on the website server (see [Links](#links)).
- **Signing.** Add the signing secrets listed in [Builds in CI](#builds-in-ci). To sign a local build instead, select your Apple Developer team in Xcode, or set the `ANDROID_KEYSTORE_*` variables before running Gradle. Never commit the keystore or certificate.

## Known gaps

- **Cross-origin requests.** In the apps, the page's address is `https://localhost` on Android and `capacitor://localhost` on iOS, not `seedbible.org`. Any Seed Bible service that only accepts requests from the website's own address (the Bible API, sign-in and records, search, images) has to accept those two addresses too. This has not yet been checked against the live services.
- **Status bar.** The page sits between the status bar and the bottom system bar rather than behind them, because the reader's layout doesn't yet account for those areas everywhere (`ios.contentInset` and `SystemBars.insetsHandling` in `capacitor.config.ts`). The strips around the bars follow the system's light or dark mode, not a custom theme picked in Seed Bible.

## Generated files

Some files are rewritten by `pnpm sync` and shouldn't be edited by hand: `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle`, and `ios/App/CapApp-SPM/Package.swift`. They point at Capacitor's packages inside `node_modules/.pnpm/`, whose folder names include version numbers, so run `pnpm sync` again after updating any `@capacitor/*` package and commit the result.
