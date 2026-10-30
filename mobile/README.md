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
- **Version numbers.** Android: `versionCode` and `versionName` in `android/app/build.gradle`. iOS: `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in the Xcode project. Both start at 1.0 (build 1).
- **Link verification.** Set `APPLE_TEAM_ID` and `ANDROID_CERT_FINGERPRINTS` on the website server (see [Links](#links)).
- **Signing.** Android release builds need an upload keystore, and iOS builds need an Apple Developer team selected in Xcode. Never commit the keystore.

## Known gaps

- **Cross-origin requests.** In the apps, the page's address is `https://localhost` on Android and `capacitor://localhost` on iOS, not `seedbible.org`. Any Seed Bible service that only accepts requests from the website's own address (the Bible API, sign-in and records, search, images) has to accept those two addresses too. This has not yet been checked against the live services.
- **Status bar.** The page sits between the status bar and the bottom system bar rather than behind them, because the reader's layout doesn't yet account for those areas everywhere (`ios.contentInset` and `SystemBars.insetsHandling` in `capacitor.config.ts`). The strips around the bars follow the system's light or dark mode, not a custom theme picked in Seed Bible.

## Generated files

Some files are rewritten by `pnpm sync` and shouldn't be edited by hand: `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle`, and `ios/App/CapApp-SPM/Package.swift`. They point at Capacitor's packages inside `node_modules/.pnpm/`, whose folder names include version numbers, so run `pnpm sync` again after updating any `@capacitor/*` package and commit the result.
