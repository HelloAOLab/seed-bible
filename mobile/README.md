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

## Before the first store release

These are left as placeholders on purpose; each needs a decision or an account.

- **App id.** `org.seedbible.app` is set in `capacitor.config.ts`, `android/app/build.gradle`, and the Xcode project. The stores never let an app change its id after it is first published, so confirm it first.
- **Icons and splash screens.** The projects still have Capacitor's default icons. Put a 1024×1024 `icon.png` (and optionally `splash.png`) in `mobile/assets/`, then generate every size with `npx @capacitor/assets generate`.
- **Version numbers.** Android: `versionCode` and `versionName` in `android/app/build.gradle`. iOS: `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in the Xcode project. Both start at 1.0 (build 1).
- **Signing.** Android release builds need an upload keystore, and iOS builds need an Apple Developer team selected in Xcode. Never commit the keystore.

## Known gaps

- **Cross-origin requests.** In the apps, the page's address is `https://localhost` on Android and `capacitor://localhost` on iOS, not `seedbible.org`. Any Seed Bible service that only accepts requests from the website's own address (the Bible API, sign-in and records, search, images) has to accept those two addresses too. This has not yet been checked against the live services.
- **Shared links.** Links the app creates from the current address, such as invites to a shared reading session, start with that local address and won't open for anyone else.
- **Links into the app.** Opening a `seedbible.org` link on a phone opens the browser, not the app; that needs Universal Links (iOS) and App Links (Android).
- **Status bar.** The page sits between the status bar and the bottom system bar rather than behind them, because the reader's layout doesn't yet account for those areas everywhere (`ios.contentInset` and `SystemBars.insetsHandling` in `capacitor.config.ts`). The strips around the bars follow the system's light or dark mode, not a custom theme picked in Seed Bible.

## Generated files

Some files are rewritten by `pnpm sync` and shouldn't be edited by hand: `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle`, and `ios/App/CapApp-SPM/Package.swift`. They point at Capacitor's packages inside `node_modules/.pnpm/`, whose folder names include version numbers, so run `pnpm sync` again after updating any `@capacitor/*` package and commit the result.
