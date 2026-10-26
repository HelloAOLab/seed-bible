# Seed Bible Developer Guide

This guide is for developers who want to build an extension for Seed Bible: a toolbar button, a panel, a source of study content, a chat assistant, or anything else that adds to the reader. You build it in your own project, test it on your own machine, and ship it from wherever you like. Users install it from a link. You don't need a copy of the Seed Bible source code, and you don't need anyone's approval to publish.

It assumes you're comfortable with web development (HTML, TypeScript, npm packages). It doesn't assume you know **Preact**, **JSX** or **signals**, the tools extensions are written with; [§2](#2-what-is-seed-bible) explains each in a few lines.

**Start with the [quick start](#1-quick-start)**: it gets an extension running in Seed Bible in a few minutes. The rest of the guide explains what you just made. Two other documents go with this one:

- **[Extension API reference](./extension-api.md)**: every `sb` call, `extension.json` field, error and limit. Keep it open while you write code.
- **[Extension security model](./extension-security.md)**: why extensions run the way they do, and what that protects users from.

If you're contributing to Seed Bible itself, and want to add an extension that ships inside the app, see [§8](#8-built-in-extensions-contributing-to-this-repo).

---

## Contents

1. [Quick start](#1-quick-start)
2. [What is Seed Bible?](#2-what-is-seed-bible)
3. [How an extension works](#3-how-an-extension-works)
4. [Writing an extension](#4-writing-an-extension)
5. [Testing it](#5-testing-it)
6. [Running, building and shipping](#6-running-building-and-shipping)
7. [Where to go from here](#7-where-to-go-from-here)
8. [Built-in extensions: contributing to this repo](#8-built-in-extensions-contributing-to-this-repo)

---

## 1. Quick start

This creates a new extension project with `create-seed-bible-extension`, runs it in a real copy of Seed Bible on your machine, and gets it ready to share.

### What you need

- **Node.js 22 or newer**, with **npm 11 or newer** (`npm install -g npm@latest`). npm 10, which comes with Node.js 22, crashes while installing a new project's tools. pnpm works too: use `pnpm` wherever this guide says `npm`.
- **git**, **[pnpm](https://pnpm.io/installation)** (version 10 or newer) and **[Bun](https://bun.sh)**. You only need these for `npm run dev`, which downloads Seed Bible and runs it locally so you can try your extension in it.

### Step 1: Create the project

```bash
npm create seed-bible-extension@latest verse-art
```

(`pnpm create seed-bible-extension verse-art` and `npx create-seed-bible-extension@latest verse-art` do the same thing.)

This makes a `verse-art/` folder with a working extension in it. The name you give becomes the extension's id, lowercased with hyphens, so `"Verse Art"` becomes `verse-art`. The files that matter most:

```
verse-art/
├── extension.json      the extension's id, version, permissions and text
├── src/
│   ├── init.tsx        the extension itself
│   └── init.test.tsx   its tests
└── package.json        scripts for running, testing and shipping it
```

### Step 2: Run it

```bash
cd verse-art
npm install
npm run dev
```

The first `npm run dev` takes a few minutes: it downloads the version of Seed Bible your project targets and installs its dependencies. Later runs reuse that copy and start in seconds.

When it's ready, it opens Seed Bible at `http://localhost:3002` with a dialog offering to install your extension. Select **Install**. A star button named after your extension appears in the reader's toolbar. Select it: it asks to see which passage you're reading, then opens a pane that says how many times you've opened it.

### Step 3: Change something

Open `src/init.tsx`. Change the toolbar button's icon from `star` to `palette`:

```tsx
icon: { material: "palette" },
```

Save, and reload the Seed Bible page. The button now shows a palette. `npm run dev` rebuilds your extension every time you save, and Seed Bible remembers that it's installed, so a reload is all you need.

Icon names come from [Material Symbols](https://fonts.google.com/icons). The text of the button and the pane is in the `translations` section of `extension.json`.

### Step 4: Test it

```bash
npm test
```

This runs `src/init.test.tsx`, which runs your extension against a stand-in for Seed Bible and checks what it does: that its button exists, that the button opens the pane, and that it still works if the user says no to the permission. [§5](#5-testing-it) explains how.

### Step 5: Share it

When you're ready for other people to use it, there are two ways to ship it:

- **`npm run publish`** uploads it to Seed Bible's own storage, so you don't need a host. The first time, it asks you to log in with your email address. It prints a link.
- **`npm run package`** writes a folder of files you can put on any static host: GitHub Pages, Cloudflare, Netlify, your own server. The project already includes a GitHub Actions workflow that does this on every push to `main`.

Either way, you get a link. People paste it into Seed Bible under **Settings → Extensions → Add extensions from a link**, then install your extension from the list. Before it runs, Seed Bible shows them what it asks permission for. When you publish a new version, everyone who installed it gets it on their next visit. [§6](#6-running-building-and-shipping) has the details.

---

## 2. What is Seed Bible?

Seed Bible is a free, collaborative Bible reading and study app. It's a website that can also be installed like an app on a phone or desktop. People read several translations side by side, highlight verses, take notes, save passages, follow reading plans, build playlists, chat, and read together in live shared sessions where everyone sees the same passage. Their data is stored in their account, so it follows them to their other devices.

An extension adds to that. What it can add:

- **Buttons** in the reader's toolbars: the main toolbar, the toolbar that appears when verses are selected, a row of compact icons above the reader, and below the chapter text.
- **Panes**: the app's windows, docked beside the reader, floating over it, or full screen, showing your own UI.
- **Dialogs**, and a panel on your extension's page in Settings.
- **Content in the Discover panel**, which shows material related to the chapter being read: cross-references, study notes, or cards that link to your own content.
- **A chat participant**, such as an assistant the user can talk to.
- **Use of the user's data and the app's features**, when the user allows it: their reading position and selection, highlights, notes, saves, reading history, the app's audio player and text-to-speech, the clipboard, the microphone and camera, and [CasualOS](https://github.com/casual-simulation/casualos) maps and 3D experiences.

### Preact, JSX and signals in two minutes

Extensions are written in TypeScript with three tools. If you've used React, you already know most of this.

- **Preact** is a small library with almost the same API as React: components, props and hooks. Anywhere you'd write React, the same ideas apply.
- **JSX** is the HTML-like syntax in `.tsx` files (`<p>{title}</p>`). It's the same JSX as React, and compiles to plain function calls that build the UI.
- **Signals** (`@preact/signals`) hold values that change. A signal is a box around a value: `const count = signal(0)` gives you `count.value` to read or write. Anything that reads `count.value` (a component, a `computed()`, an `effect()`) runs again automatically when it changes, with no dependency list to keep up to date. Think of a spreadsheet cell: everything that refers to it updates when it changes. Seed Bible hands you things that change, like the passage being read, as signals.

---

## 3. How an extension works

**Your code runs in a sandbox.** Seed Bible loads your extension into hidden iframes with their own, unique origin, separate from the app's page. Your code can't see the app's page, the user's login, or their data. It reaches Seed Bible only through one object, `sb`, which the SDK (`seed-bible/extensions`) gives you. Every `sb` call is a message to the app, and the app checks each one against what the user allowed before doing anything. That's what lets people install an extension from anyone without worrying about it: it can only do what they agreed to.

**Permissions are declared up front.** `extension.json` lists the permissions your extension needs. Before anything of yours runs, Seed Bible shows the user, in plain language, what the extension will be able to do, and they agree or not. Permissions that matter most to privacy (changing the user's data, identifying them, reading their notes, involving other people, the microphone or camera) can't be required at install. Your extension asks for them later, at the moment the user tries the feature that needs them, and must keep working if they say no.

**Two kinds of frame.** Your extension has:

- one hidden **background frame**, which runs your `main` function once when the extension starts. It registers your buttons and providers, and handles them being used. It lives until the extension is uninstalled or the page is reloaded.
- a **view frame** for each pane, dialog or settings panel you show. Seed Bible draws the pane itself (its border, title and close button, and a badge with your extension's name), and renders one of your `views` inside it in its own frame. The view frame goes away when the pane closes.

**Your extension's life:**

1. **Install.** The user adds your link and selects Install. They see what it asks permission for and agree.
2. **Start.** Seed Bible downloads your bundle, checks it against the hash in your manifest (so the code can't be swapped after the fact), and runs `main`. This happens again on every visit, on every device the user is signed in on.
3. **Use.** The user selects your buttons and opens your panes. Your code calls `sb`.
4. **Update.** When you publish a new version, it's used on the user's next visit. If it asks for no new permissions, it loads without a prompt. If it asks for more, the user sees only what's new, and it doesn't load until they agree.
5. **Uninstall.** Everything you registered is removed, your storage is deleted, and Seed Bible forgets what the user granted, so reinstalling asks again.

**What a sandboxed extension can't do (yet).** It can't depend on other extensions, and it's never installed without the user being asked. A chat provider replies with one whole message (no streaming), and a Discover provider answers with data (`content`, `cross-reference` or `study-note` results), not its own markup. If your background frame stops responding, Seed Bible stops the extension until the page reloads. Styles must come from your bundle itself, as inline styles or CSS imported with `?inline`, since a frame can't load a separate stylesheet.

---

## 4. Writing an extension

### The shape of an extension

The module's default export is the result of `defineExtension`:

```tsx
import { defineExtension } from "seed-bible/extensions";

export default defineExtension({
  // Runs once in the background frame when the extension starts.
  main: async (sb) => {
    await sb.tools.registerVerseToolbarTool({
      id: "share-art",
      title: { key: "share-art", defaultValue: "Make art" },
      icon: { material: "palette" },
      onSelect: ({ selection }) =>
        void sb.panes.open({
          view: "art",
          placement: "side",
          title: "Verse art",
          props: { verses: selection.map((v) => v.verse) },
        }),
    });
  },
  // One entry per kind of pane; each renders in its own frame.
  views: {
    art: ({ sb, props }) => (
      <p>
        {sb.i18n.t("art-intro")} {JSON.stringify(props)}
      </p>
    ),
  },
});
```

- **`main`** runs once in the background frame. Register your buttons and providers here. Only `main` can register them; a view can't.
- **`views`** maps a name to a Preact component. You show one by name with `sb.panes.open({ view })`, `sb.modals.open({ view })` or `sb.settings.registerPanel(view)`. Each view gets its own `sb`, plus the `props` it was opened with.

Each frame's theme colors, fonts, language and text direction are set for you, so `var(--sb-font-color)`, `var(--sb-background)` and the app's other `--sb-*` CSS variables work in your styles, and follow the user into dark mode.

### What `sb` offers

The [API reference](./extension-api.md#3-the-sb-object) has every call in detail. In short:

- **`sb.tools.registerToolbarTool`** / **`registerVerseToolbarTool`** / **`registerQuickTool`** / **`registerBelowReaderTool`**: buttons. `icon` is `{ material: "<Material Symbols name>" }` or `{ svg: "<svg…>" }`; `isVisible`/`isDisabled` are booleans or signals; a submenu is a list of `items`, each with its own `onSelect`. Each returns a handle with `update()` and `unregister()`. Priorities are kept between 200 and 999, after the app's own tools.
- **`sb.panes.open({ view, placement, title, props })`** and **`sb.panes.close(id)`**. `props` must be JSON.
- **`sb.app.toast(message)`** (shown with your extension's name) and **`sb.app.isMobile`**.
- **`sb.storage.get/set/remove/keys`**: your own JSON key/value store, up to 256 KB. The frame has no `localStorage`. While the user is signed in it syncs to a private record in their account, so it follows them to their other devices (the newer write to a key wins). Signed out, it stays on the device. It's cleared everywhere when the user uninstalls your extension.
- **`sb.settings.get(key)`**: your own non-sensitive settings from `extension.json`, which the user changes on your extension's page in Settings.
- **`sb.i18n.t(key, defaultValue, values)`**, **`sb.i18n.language`** and **`sb.i18n.direction`**: strings come from your `extension.json` translations.
- **`sb.reading.position`**, **`sb.reading.selection`** and **`sb.reading.open(ref)`**, if granted (below).

A call that isn't allowed rejects with a `SandboxError` whose `code` says why: `permission_denied`, `invalid_request`, `not_found`, `limit_exceeded` or `unavailable`. The [reference](./extension-api.md#5-errors) says what each means and what to do about it.

### Permissions and network hosts

Declare them in `extension.json`. The user sees them, in plain language, before anything of yours runs:

```json
{
  "id": "verse-art",
  "version": "1.0.0",
  "icon": "icon.png",
  "permissions": ["reading:selection"],
  "optionalPermissions": ["reading:position"],
  "network": ["api.verse-art.example"],
  "translations": { "en": { "title": "Verse Art", "description": "…" } }
}
```

| Permission          | What it gives you                                                                                     | Can be required |
| ------------------- | ----------------------------------------------------------------------------------------------------- | --------------- |
| `reading:position`  | `sb.reading.position`: the current translation, book and chapter, kept up to date; Discover providers | Yes             |
| `reading:selection` | `sb.reading.selection`, and the selected verses in a tool's `onSelect`                                | Yes             |
| `reading:navigate`  | `sb.reading.open({ bookId, chapter, verse })`                                                         | Yes             |
| `reading:history`   | `sb.history.list({ from, to })`                                                                       | Yes             |
| `highlights:read`   | `sb.highlights.list(...)`                                                                             | Yes             |
| `highlights:write`  | `sb.highlights.add(...)` / `remove(...)` (and reading)                                                | No              |
| `notes:read`        | `sb.notes.list(...)`, as plain text                                                                   | No              |
| `notes:write`       | `sb.notes.create(...)`, and `update`/`delete` for the notes it added (and reading)                    | No              |
| `saves:read`        | `sb.saves.list()`                                                                                     | Yes             |
| `saves:write`       | `sb.saves.add(...)` / `remove(id)` (and reading)                                                      | No              |
| `profile:read`      | `sb.profile.get()`: name, picture and real account id                                                 | No              |
| `chat:respond`      | `sb.chats.registerProvider(...)`, for chats the user adds it to                                       | Yes             |
| `chat:shared`       | `shared: true` on a chat provider, for chats with other people (and `chat:respond`)                   | No              |
| `friends:read`      | `sb.friends.list()`: names and pictures, with pseudonymous ids                                        | No              |
| `session:read`      | `sb.session.current`: who's in the shared reading session open in the current tab                     | No              |
| `audio:playback`    | `sb.audio`: the app's audio player, for your audio files, recorded narration and text-to-speech       | Yes             |
| `clipboard:write`   | `sb.clipboard.writeText(text)`                                                                        | Yes             |
| `embed:casualos`    | `sb.portals.open(...)`: a CasualOS grid or map portal (an `ao.bot` pattern) in a pane                 | Yes             |
| `device:microphone` | `sb.devices.recordAudio()`: a recording, through a dialog the app shows                               | No              |
| `device:camera`     | `sb.devices.takePhoto()`: a photo, through a dialog the app shows                                     | No              |

**"Can be required: No"** means the permission can only go under `optionalPermissions`, and you ask for it with `sb.permissions.request` when the feature that needs it is used. A manifest that lists one under `permissions` won't install, and `npm run check` (which `build` and `publish` run) stops with a message saying which to move. The rule: anything that changes the user's data, identifies them, reads their private notes, involves other people, or uses the microphone or camera is always optional. Users can also turn optional permissions on and off themselves, on your extension's page in Settings → Extensions. That restarts your extension with the new set, so read `sb.permissions.has()` rather than assuming.

`network` lists every host your frames may contact (`fetch`, images, media, fonts); anything else is blocked. Requests arrive with `Origin: null`, so the server must allow that in its CORS headers (`Access-Control-Allow-Origin: *` does). A manifest that names a permission this version of Seed Bible doesn't know won't install, rather than install without it. Network hosts can't be optional.

**Icon.** `icon` is a square image in your project (`.png`, `.svg`, `.webp` or `.jpg`, under 256 KB; 256 pixels across is plenty). Seed Bible shows it wherever your extension is listed, on its page and in the install dialog, in place of the colored initials it shows otherwise. `publish` uploads it to its own link and puts that link in the manifest; `package` copies it next to the bundle and `dev` serves it. You can also give a full `https:` link to an image hosted elsewhere. `check` refuses an icon Seed Bible couldn't show.

**Needs no permission:** `sb.identity` (an id for the user that's the same every time for your extension, different for every extension, not their real id, and null when signed out), `sb.bible.chapter({ translationId, bookId, chapter })` for public Bible text, `sb.sensitive.fetch(...)` for requests that carry the user's sensitive settings such as API keys (see the [`sensitive` section](./extension-api.md#sensitive-settings) of `extension.json`), `sb.modals.alert`/`open`, and `sb.settings.registerPanel(view)` for a view on your extension's Settings page.

### Asking for optional permissions

Anything your extension can work without goes under `optionalPermissions`. The install dialog only asks for `permissions`; it mentions the optional ones as things you may ask for later. Ask for one when the feature that needs it is used:

```tsx
await sb.tools.registerToolbarTool({
  id: "follow-along",
  title: "Follow along",
  icon: { material: "sync" },
  onSelect: async () => {
    if (await sb.permissions.request("reading:position")) {
      startFollowing(sb.reading.position);
    } else {
      void sb.app.toast(
        "Following along needs to see which passage you're reading."
      );
    }
  },
});
```

`sb.permissions.request(permission | permission[])` resolves `true` once everything asked for is granted. It resolves straight away, without a prompt, when that's already the case. If the user says no, later requests for that permission resolve `false` without asking again until the page reloads, so design the feature to carry on without it. `sb.permissions.granted` (a signal), `sb.permissions.has()` and `sb.permissions.optional` tell you where things stand. What the user grants is remembered, including through updates that still list it.

### Only right after the user interacts with your extension

Some calls show something or start something the user didn't ask for, so Seed Bible only allows them as a direct response to the user: `sb.permissions.request`, `sb.modals`, starting or resuming audio (`sb.audio.play`, `playNarration`, `readAloud`, `resume`), `sb.clipboard.writeText`, `sb.devices.recordAudio` and `sb.devices.takePhoto`. At any other time they reject with `invalid_request`. Call them from a tool's `onSelect`, or a click in one of your panes.

### People, without their real ids

A friend's or session participant's `id` is pseudonymous the same way `sb.identity` is: stable for your extension, different for every extension, never the real account id. It's also the same as that person's own `sb.identity` in your extension, so you can match people up on your own server. Guests in a session (not signed in) get an id for their connection instead, which changes when they reconnect. `sb.session.current` is null when there's no shared session in the current tab.

### Writing user data needs an account

`notes.create`, `saves.add` and similar reject with `unavailable` when the user is signed out, rather than prompting them to sign in. Tell the user, and let them try again after signing in.

### The app's audio player

`sb.audio` plays through the same player as the app's own narration: it shows in the reader's playback controls for the tab in view, where the user can pause, scrub and stop it, it keeps playing when your pane closes, and starting it pauses whatever else the app was playing. Your extension plays one thing at a time; starting another replaces it.

- `play(url)`: an audio file, `https:` on one of your `network` hosts (it plays in the app's page, so only from hosts the user approved).
- `narrators({ translationId, bookId, chapter })` and `playNarration({ ..., reader? })`: the app's recorded narration of a chapter, by a named reader or the first there is. It rejects with `not_found` when there's none, so fall back to `readAloud`.
- `readAloud({ translationId, bookId, chapter, fromVerse?, toVerse? })`: the app's text-to-speech. Its position counts verses, not seconds.
- `pause()`, `resume()`, `seek(position)` and `stop()` only ever reach what your extension is playing. `sb.audio.playback` is a signal with what that is (`kind`, `isPlaying`, `position`, `duration`, `unit`), or null.

Each `play…` resolves when playback ends, with `finished: false` if it was stopped rather than played to the end: by you, by the user, by something else taking over that tab's player, or by the tab closing. Unlike the app's own narration, yours doesn't highlight verses as they're read or count toward reading history. A frame can still play audio by itself with an `<audio>` element from a `network` host, without any permission, but it stops when the frame closes and has no controls in the app.

### The microphone and camera

Your frames can't use `getUserMedia` (browsers only allow it in pages with a real origin, and your frame's origin is opaque). Instead, `recordAudio({ maxSeconds })` and `takePhoto()` ask the app to show its own dialog, titled with your extension's name. The device is only on while that dialog is open, nothing is recorded until the user presses Record (or Take photo), and you get back just the result, as a `Blob`, or `null` if they cancelled. There's no live stream, so real-time uses (speech recognition as they talk, video calls) aren't possible. Recordings are at most `maxSeconds` long (60 by default, up to 300). The browser also asks the user for the device the first time, on Seed Bible's behalf.

### CasualOS portals

`sb.portals.open({ pattern, portalType, portal?, inst?, query?, placement, title })` opens an `ao.bot` grid or map portal in a pane the app draws: a [CasualOS](https://github.com/casual-simulation/casualos) map or 3D experience. It isn't inside your frame (a frame nested in the sandbox couldn't run `ao.bot`). `pattern` is `{ name }` or `{ aux: "https://…" }`. Without `inst`, each open gets a fresh instance. `query` can't set `inst`, `staticInst`, `gridPortal`, `mapPortal`, `pattern` or `patternAux`. The handle's `send(message)` posts to the portal, and `onMessage(listener)` receives what its `os.sendEmbedMessage` sends. The pattern runs on `ao.bot`, outside Seed Bible's sandbox, with whatever `ao.bot` itself can do in the user's browser.

### A full example

`packages/sandboxed-example-extension` in this repo uses most of the API in one place: tools, a pane that reads its settings, a Discover provider, a sensitive request, and CasualOS portals behind an optional permission, with tests in `test/unit/sandboxed-example-extension/`.

---

## 5. Testing it

`createTestHost` from `seed-bible/extensions/testing` runs your extension in a unit test, against a stand-in for Seed Bible, through the same SDK and messages as the app. Every call is checked against the permissions the test grants, so a test catches a missing permission the way the app would. `npm test` runs your tests with [Vitest](https://vitest.dev).

```tsx
import extension from "../src/init";
import { createTestHost } from "seed-bible/extensions/testing";

it("toasts from its verse tool", async () => {
  const host = await createTestHost(extension, {
    granted: ["reading:selection"],
  });
  await host.ready; // main has finished
  await host.selectTool("share-art", {
    selection: [
      { translationId: "BSB", bookId: "JHN", chapterNumber: 3, verse: 16 },
    ],
  });
  expect(host.toasts).toEqual(["Copied!"]);
});
```

- `host.tools`, `host.panes`, `host.toasts`, `host.storage`, `host.opened`, `host.clipboard` and `host.calls` record what the extension did.
- `host.renderView(name)` renders a view into the test's document; `host.setState({ position })` moves the reader; `host.discover(...)` and `host.chat(...)` ask its providers.
- `allowRequests: false` makes the "user" decline optional permissions.
- For anything the stand-in doesn't simulate (Bible text, highlights, sensitive requests…), pass an answer in `answers: { "bible.chapter": () => ({ verses: [...] }) }`. Without one, the call fails with a message saying so.

The [API reference](./extension-api.md#9-testing-with-createtesthost) lists every option.

---

## 6. Running, building and shipping

Your project's `package.json` scripts call `seed-bible-extension-scripts`. Its [README](../packages/seed-bible-extension-scripts/README.md) is the full reference, with step-by-step hosting on GitHub Pages and Cloudflare, and what to do when an install fails.

| Script                                                          | What it does                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`                                                   | Runs Seed Bible locally with your extension, rebuilding it as you save.        |
| `npm run check`                                                 | Type-checks, and checks `extension.json`'s permissions against your code.      |
| `npm run lint` / `lint:fix`                                     | Lints with ESLint.                                                             |
| `npm test`                                                      | Runs the tests.                                                                |
| `npm run build`                                                 | Checks, tests, and builds `dist/standalone/index.js`.                          |
| `npm run package`                                               | Builds `dist/site/`: files to upload to any static host, with an install page. |
| `npm run deploy:cloudflare-pages` / `deploy:cloudflare-workers` | Packages and deploys to Cloudflare.                                            |
| `npm run publish`                                               | Builds and uploads to Seed Bible's own storage, with no host needed.           |

### `check`

Type-checks the project, then checks `extension.json` the way Seed Bible will when installing it: every permission is one it knows, and none that can only be optional is listed as required. It also reads your code for the `sb.*` calls that need a permission (`sb.highlights.add`, `sb.reading.position`, …). One whose permission `extension.json` doesn't declare is an error, since Seed Bible would refuse it every time. A declared permission nothing seems to use is a warning, since it only makes the install prompt longer. It reads the code as text, so it can't see a call made some roundabout way.

### `dev`

Runs your extension in a real Seed Bible, the way users will get it. It builds the bundle and rebuilds it whenever you save, serves it from `http://localhost:5174`, starts Seed Bible on `http://localhost:3002`, and opens it with a link that offers to install your extension. Approve it once; after that, reload the page to run your latest code. Seed Bible remembers the extension, and a change to `extension.json` that asks for more shows the update prompt, as a real update would.

Which Seed Bible it runs follows your project's `seed-bible` dependency, the way an Android app's `targetSdkVersion` picks the platform it's built against:

- A version range (`"seed-bible": "^1.14.0"`) runs the newest release that satisfies it. Each release gets its own cached copy, so to move to a newer Seed Bible, raise the version in `package.json` and the next `dev` uses it.
- A local path (`"seed-bible": "link:../seed-bible/packages/seed-bible"`) runs the checkout that path points into, so your own changes to Seed Bible show up immediately.
- `--seed-bible-version <range|branch>` overrides it for one run, e.g. `npm run dev -- --seed-bible-version develop` for unreleased changes. `--repo <path>` uses an existing checkout. `--port` and `--extension-port` change the two ports.

`dev` stops with an error if the chosen version is too old to install an extension from a link, instead of starting without it.

### `build`

Runs `check` and the tests, then writes `dist/standalone/index.js`: one ES module with Preact and everything else your code imports bundled in. That's the file Seed Bible loads.

### `package`: host it yourself

Writes `dist/site/`, a folder of static files that installs your extension from any static host, at any address:

- the bundle, named by its hash, so it can be cached for good;
- `extension-set.json`, the link Seed Bible installs from, which points at the bundle and pins its hash;
- an `index.html` with an "Install in Seed Bible" button;
- the host config Seed Bible needs to fetch the files (`_headers` for Cloudflare and Netlify, `.nojekyll` for GitHub Pages).

A new project can deploy it three ways: to GitHub Pages with the included `.github/workflows/deploy-pages.yml` (on every push to `main`, once the repository's Pages source is set to GitHub Actions), or with `npm run deploy:cloudflare-pages` or `npm run deploy:cloudflare-workers`. Share the hosted page, or its `extension-set.json` link. `--app-url` points the install button at another Seed Bible.

### `publish`: no host needed

Runs `build`, uploads the bundle to Seed Bible's own storage, and prints the extension's link along with a ready-made install link. The link stays the same every time you publish, so everyone who installed from it gets the new version on their next visit. The first `publish` asks you to log in (an email address, then the code it emails you) and creates a long-lived key, which it prints and asks you to save as `SEED_BIBLE_RECORD_KEY`. Every later `publish`, including in CI, uses that instead. `--dry-run` shows what it would upload without uploading anything.

### How users install it

A user pastes your link into **Settings → Extensions → Add extensions from a link**, which lists your extension under Available; installing it then shows the consent dialog. A link to Seed Bible with `?extensionSet=<your link>&autoinstall-<id>=true` opens that dialog directly. Either way, Seed Bible remembers where the extension came from (on the device and in the user's account), so it loads again on their next visit and on their other devices. Only `https:` links can be added, plus `http://localhost` while you develop.

---

## 7. Where to go from here

- Keep the [API reference](./extension-api.md) open while you work: it lists every `sb` call, `extension.json` field, error and limit. Your editor shows the same documentation when you hover over an `sb` call.
- Read `packages/sandboxed-example-extension/` for a fuller example than the starter project.
- Read the [security model](./extension-security.md) to understand what the sandbox protects users from, and what it doesn't.
- Found something the API can't do? [Open an issue](https://github.com/HelloAOLab/seed-bible/issues) describing what you're trying to build.

---

## 8. Built-in extensions: contributing to this repo

Everything above is about extensions you build in your own project and ship from a link. Seed Bible also has **built-in extensions**: ones whose source lives in this repo under `packages/`, is reviewed in a pull request, and is compiled into the app. Every extension that ships with Seed Bible today works this way (`locations-extension`, `audio-reader-extension`, `apologist-extension`, `bonfire-extension`, `transcript-ui-extension`, `twitchPub-extension`, `twitchSub-extension`, and the reference template, `seed-bible-refresh-example-extension`).

The difference that matters: **a built-in extension isn't sandboxed.** It runs in the app's own page, written with `registerExtension` from `seed-bible` instead of `defineExtension`, and gets the app's entire internal state, the same objects the app itself uses. That's why it can only ship through a reviewed pull request. If you're not a Seed Bible contributor, you want the sandboxed extensions in §§1–6 instead.

Built-in extensions are discovered at build time: any folder under `packages/` with an `extension.json` is picked up (see `script/lib/vite-plugin-extensions.ts`). Run `pnpm dev` from the repo root and use the extensions list in Settings to install and uninstall yours while you work on it. `seed-bible-extension-scripts` can also develop one out of the repo: for a project written with `registerExtension`, `dev` puts it into the app's own build through `SEED_BIBLE_EXTRA_EXTENSION_DIRS`, with hot reloading, as if it lived in `packages/`, and `build` writes `dist/monorepo-package/`, its checked source, ready to copy into `packages/<name>/`.

### 8.1 The app's managers

A built-in extension's `context` is the app's own state. Its functionality lives in a set of **managers** (`packages/seed-bible/seed-bible/managers/`), each owning one area. This is a useful map of "what the app can do," and it's also the map of what an extension can hook into, since extensions get access to (almost) the same manager objects the app itself uses.

- **Bible reading.** Multiple translations, book/chapter navigation, and a "tab" model where each open chapter is a tab — like browser tabs, but for Bible chapters. Tabs can be arranged into multiple side-by-side panels (so you can read two translations, or two different passages, at once).
- **Highlights, bookmarks, and annotations.** Verse highlighting (with color choices), bookmarking a reading position, and free-form notes attached to a location — all persisted to the user's account so they follow the user across devices.
- **Shared reading sessions.** A live, multiplayer version of the reader: one user creates a session, shares a link or invite, and everyone in the session sees the same passage and selections update in real time. This is the CRDT/Yjs-backed multiplayer piece mentioned above.
- **Chat.** An in-app chat panel. Chat "providers" (registered by the app or by extensions) can act as an AI participant in a chat — see [§8.3](#83-what-built-in-extensions-can-plug-into) for a real example that wires in an external chatbot.
- **Discover.** A contextual side panel that shows extra content for whatever chapter you're currently reading — cross-references, study notes, or arbitrary custom content. What shows up there comes from "Discover providers," which (again) extensions can register.
- **Playlists and reading plans.** Playlists are ordered, shareable queues of Bible content (and other media) that can be played back sequentially. Reading plans are structured, calendar-driven reading schedules with progress tracking.
- **Search.** Full-text Bible search, backed by Typesense.
- **Themes.** Light/dark mode plus configurable color schemes, applied via CSS variables.
- **Internationalization.** The UI is translated into 24 languages (`i18n/` — see `CLAUDE.md` for the translation workflow), with layout that adapts to right-to-left languages.
- **Onboarding and tutorial.** A first-run welcome flow and a guided tour of the main UI for new users.
- **Extensions.** A plugin system that lets you add all of the above kinds of things — tools, panels, chat providers, discover content — without touching the core app's code. Sandboxed extensions reach these features only through `sb`; built-in ones use the managers directly.

Separately, `patterns/` contains embeddable CasualOS applets (currently just a map/geo importer) that render inside cross-origin iframes. These are a different mechanism from extensions — see [§8.4](#84-extensions-vs-patterns).

### 8.2 Anatomy of a built-in extension

The clearest reference is the reference template extension, `packages/seed-bible-refresh-example-extension/`. A minimal extension package looks like this:

```
my-extension/
├── package.json
├── index.ts              # re-exports the init function as default
├── extension.json         # metadata: id + per-language title/description
└── ext_MyExtension/
    └── init.tsx           # the actual logic
```

**`package.json`** — an ordinary npm package. It needs a dependency on the `seed-bible` workspace package (so it can import `registerExtension` and the app's types):

```json
{
  "name": "@seed-bible/my-extension",
  "type": "module",
  "exports": { ".": { "import": "./ext_MyExtension/init.tsx" } },
  "dependencies": { "seed-bible": "workspace:*" }
}
```

**`extension.json`** — the metadata that the app needs _before_ the extension is even installed, so it can list the extension in the Settings UI:

```json
{
  "id": "my-extension",
  "translations": {
    "en": {
      "title": "My Extension",
      "description": "What this extension does, in one sentence."
    }
  }
}
```

You can add more keys per language beyond `title`/`description` — those are the strings your extension's own UI uses (via the `useI18n` hook), and per `CLAUDE.md`'s translation convention, **only `en` needs to be complete**; other languages are filled in separately by translators. Note: `extension.json` also supports `dependencies` (an array of other extension IDs this one needs) and `autoinstall: true` (installed by default for every user the first time they see it — see [§8.2.3](#823-installation-and-persistence)).

**`index.ts`** — just re-exports your init function as the module's default export:

```ts
export { default } from "./ext_MyExtension/init";
```

**`init.tsx`** — the actual extension. This is where `registerExtension()` is called:

```tsx
import { registerExtension, type SeedBibleState } from "seed-bible";

export default function initMyExtension() {
  registerExtension({
    id: "my-extension",
    init: function* (context: SeedBibleState) {
      // ... register tools, panes, providers, etc. — see §8.3
    },
  });
}
```

#### 8.2.1 The `init` function: what it receives and what it returns

`init(context, dependencies)` is called once your extension is actually being activated:

- **`context`** is the entire app state object (`SeedBibleState`) — the same object every manager listed in [§8.1](#81-the-apps-managers) hangs off of. Your extension reads and calls into it directly: `context.tools.registerToolbarTool(...)`, `context.panes.openPane(...)`, `context.app.toast(...)`, etc. There's no separate, cut-down "extension API" — you get the same surface the core app itself uses, which is a deliberate choice: an extension can do everything the core app can do.
- **`dependencies`** is an object keyed by extension ID, containing whatever each of your declared `dependencies` returned from _its own_ `init`. This is how one extension can call functions exposed by another (see [§8.2.4](#824-dependencies-between-extensions)).

`init` can be written two ways, and you'll see both in this codebase:

1. **A plain function that returns an object.** The returned object is this extension's public export — what other extensions see in their `dependencies` if they depend on this one.
2. **A generator function** (`function* (context) { ... }`) — this is the more common pattern, and it's worth explaining if you haven't used JS generators before. Inside a generator, `yield someValue` doesn't return from the function; it pauses and hands `someValue` back to the caller, and hands control back to you the _next_ time the caller asks for the next value. `ExtensionInitalizer` (the thing that runs your `init`) takes advantage of this: every value you `yield` is treated as a **cleanup function** — most tool-registration calls (`registerToolbarTool`, `registerVerseToolbarTool`, an `effect()`, etc.) themselves return a "stop doing this" function, so you `yield` that return value. When the extension is later uninstalled, every yielded cleanup function gets called, undoing exactly what that registration did. When the generator finally `return`s (like an ordinary function would), that return value becomes the extension's public export, exactly as in case 1.

Here's the shape in practice, from the example extension:

```tsx
init: function* (context: SeedBibleState) {
  // Each of these returns an "unregister" function, which we yield so it
  // gets called automatically on uninstall:
  yield context.tools.registerToolbarTool({ /* ... */ });
  yield context.tools.registerVerseToolbarTool({ /* ... */ });
  yield effect(() => { /* react to state changes */ });

  // The final `return` — not a `yield` — is this extension's public export:
  return {
    abc: () => console.log("callable by extensions that depend on this one"),
  };
},
```

If your extension doesn't register anything that needs cleanup, a plain function that just does its setup and returns `{}` (or nothing) is perfectly fine — you don't have to use a generator.

#### 8.2.2 The extension lifecycle

Putting it together, here's the full life of an extension:

1. **Discovery.** For bundled extensions, this happens at build/dev-server time: every `packages/<folder>/extension.json` is scanned and becomes an entry in the app's known extension set. For URL-loaded extensions, discovery is just whatever piece of your app UI calls `loadExtensionFromUrl(id, url)`.
2. **Registration.** The extension's module is imported and its default export function is _called_. That call runs `registerExtension({ id, init, dependencies })`, which records the extension as "known" but does **not** run `init` yet — only when the app's context is ready and all declared dependencies are already initialized.
3. **Initialization.** Once the app context exists and dependencies (if any) have resolved, `init(context, dependencyExports)` runs. This is where your extension actually adds its tools/panes/providers. If `init` throws, the error is logged and the extension is treated as not-yet-initialized (it'll retry the next time something re-triggers initialization, e.g. a dependency resolving).
4. **Installed state persists.** Once installation succeeds, the extension's ID is saved to `localStorage` and (if the user is logged in) mirrored into their synced profile — so an installed extension is remembered across reloads and follows the user to other devices. (`autoinstall: true` extensions get installed for every user automatically the first time, but a user who then uninstalls one won't have it silently reinstalled later.)
5. **Uninstallation.** When the user uninstalls the extension, every cleanup function it `yield`ed gets called (removing its tools, closing its effects, etc.), and its ID is dropped from the persisted install list.
6. **Reinstallation.** Because the extension's ES module was already evaluated once (JavaScript only runs a module's top-level code the first time it's imported), reinstalling doesn't naturally re-run your code. This is why the contract requires the default export to be a **function**, not just top-level side effects — the loader explicitly calls that cached function reference again on every (re)install attempt, which re-triggers `registerExtension(...)` and a fresh `init()` run. In practice this means: **don't rely on top-level code in your module running more than once** — put your setup inside the function you export as default.

#### 8.2.3 Installation and persistence

A couple of details worth knowing if you're building UI around extensions (or just want to understand why installs behave the way they do):

- Installed-extension IDs are tracked in two places — `localStorage` (works while logged out) and the logged-in user's synced profile (works across devices) — and merged together using install/uninstall timestamps, specifically so that uninstalling an extension on one device doesn't get silently undone by a stale copy of "still installed" from another device.
- `autoinstall: true` in `extension.json` means the extension is installed automatically the first time a user's session sees it (e.g. you shipped a new default extension in a release). It is deliberately a one-time nudge: if a user uninstalls it, that decision sticks, even on their next visit.
- Extensions can also be force-installed via a URL query parameter for testing (`?autoinstall-<extension-id>=true`), independent of the `autoinstall` metadata flag.

#### 8.2.4 Dependencies between extensions

An extension can declare `dependencies: ["other-extension-id"]` (in the `registerExtension()` call, or in `extension.json` for a whole package's install-time dependency) to require another extension to be initialized first. The dependency's `init` return value shows up in the dependent's `init(context, dependencies)` second argument, keyed by ID:

```tsx
registerExtension({
  id: "my-extension",
  dependencies: ["other-extension"],
  init: function* (context, dependencies) {
    const other = dependencies["other-extension"]; // whatever "other-extension" returned
    other.someExportedFunction();
  },
});
```

Circular dependencies are detected and rejected (with a console error) rather than causing an infinite loop.

**The extensions in this repo don't depend on each other.** A dependency installs the other extension too, with everything it adds to the app, which is rarely what someone turning on the first one wanted: turning on Theographic used to turn on the Locations verse tool as well. When two built-in extensions need the same code, it goes in a _shared package_ instead: a folder under `packages/` with a `package.json` but no `extension.json`, so the app never lists or installs it. Each extension imports it like any other module:

| Shared package                 | What it holds                                              | Used by                            |
| ------------------------------ | ---------------------------------------------------------- | ---------------------------------- |
| `@seed-bible/bible-locations`  | The known Bible places and where their map outlines live   | Locations, Theographic             |
| `@seed-bible/transcription`    | Transcribing sermon audio and finding the references in it | AI Transcript UI, Twitch publisher |
| `@seed-bible/seed-bible-utils` | Book arrangements, reading history and presence services   | Bible Stack, Scripture Map         |

Nothing has to load these by hand. Every extension's code is already loaded on demand, through an `import()` per extension, and the bundler puts a module that two of those imports share into its own chunk. That chunk downloads the first time any extension that needs it is installed, and the browser reuses it for the next one.

A shared package is plain modules, so anything it keeps lives once per page, not once per extension. When it needs per-app state that should be shared and then cleaned up, hand it out the way `acquireSeedBibleUtils(context)` does: the first extension to ask builds it, each one `yield`s the `release` it gets back, and it's torn down when the last one is uninstalled. A shared package that shows text brings its own translations in a `translations.json` (see `packages/transcription/donation.tsx`; the lint checks its keys under the folder name), since nothing installs it to load them.

`test/unit/script/extensionBoundaries.test.ts` fails if a package under `packages/` with an `extension.json` imports from another one, or declares `dependencies`.

### 8.3 What built-in extensions can plug into

Because `init` gets the same `context` the core app uses, "what can an extension do" is really "what's on `context`." Below are the extension points you're most likely to use, each with a real example already in this codebase.

#### Toolbar tools — buttons in the reader's main toolbar

`context.tools.registerToolbarTool({...})` adds a button to the reader's toolbar. It needs an `id`, a `title` (a string, or a translation key + default value), an `icon` (a small component), a `priority` (lower numbers sort earlier — extensions should generally use 200–999, after the built-in tools), and either an `onSelect` handler or a `getItems` function that returns a submenu.

The example extension uses this to open a custom pane:

```tsx
yield context.tools.registerToolbarTool({
  id: "my-example-tool",
  title: {
    key: "my-example-tool",
    defaultValue: "My Example Tool",
    ns: "example-extension",
  },
  icon: () => <span>TOOL!</span>,
  onSelect: () => {
    context.panes.openPane({
      placement: "side",
      title: "My Example Tool",
      component: () => <div>Hello from my extension!</div>,
    });
  },
  priority: 100,
});
```

#### Verse toolbar tools — actions on selected verses

`context.tools.registerVerseToolbarTool({...})` adds an action that appears when the user has selected one or more verses. `isVisible` can be a function returning `true`/`false` (or a signal), so the tool can hide itself unless it's relevant.

The **locations extension** (`packages/locations-extension/`) uses this well: it scans the currently-selected verses' text for place names it recognizes, and only shows a "Locations" tool (with a submenu listing each found place) when at least one match was found. Selecting a place fetches GeoJSON boundary data and opens it on a map (rendered via a CasualOS _pattern_ — see [§8.4](#84-extensions-vs-patterns)) inside a floating pane.

#### Quick tools — compact icons above the reader

`context.tools.registerQuickTool({...})` is for small, always-visible-when-relevant icons in the reader's top row (next to the bookmark button). The **audio-reader extension** (`packages/audio-reader-extension/`) uses this for a play/pause button that only appears when the current chapter has narration audio available, and its `icon` swaps between a play and pause glyph based on a signal tracking playback state.

#### Below-reader tools

`context.tools.registerBelowReaderTool({...})` adds something to a toolbar shown underneath the reading pane itself (rather than above it).

#### Custom panes — your own UI, anywhere in the app's pane system

`context.panes.openPane({...})` opens an arbitrary Preact component in one of three placements: `"side"` (a docked side panel), `"floating"` (a draggable/resizable window), or `"fullscreen"` (covers the reader). This is how a toolbar tool's `onSelect` typically shows its actual content. Panes can also embed a CasualOS grid or map portal via the `<PortalComponent>` helper (as the locations extension and the example extension both do), which is how an extension can render a whole separate CasualOS "pattern" application inside the main app.

#### Discover providers — contribute content to the Discover panel

`context.discover.registerDiscoverProvider({ id, title, description, discover })` lets an extension contribute to the "Discover" side panel, which shows extra material for whatever chapter is currently open. `discover(context)` receives the current translation/book/chapter/language and returns a list of results — cross-references, study notes, or arbitrary rendered content. The example extension registers a toy provider that returns a canned cross-reference between Genesis 1 and John 1.

#### Chat providers — plug in a conversational participant

`context.chats.registerProvider({ id, name, generateResponse, supportsSharedChats })` adds a chat participant that can generate responses to messages — effectively, "install an AI assistant into the chat panel." The **apologist extension** (`packages/apologist-extension/`) is a complete real example: it reads configuration from the URL's query parameters (an API domain, key, model, an optional shared-conversation token), and its `generateResponse` forwards the conversation (plus what chapter the user is currently reading, for context) to an external chat-completion API and returns the reply as a chat message.

#### Reacting to app state — effects

Since app state lives in signals, an extension reacts to it the same way any component does: with `effect(() => { ... })`, which re-runs whenever any signal it reads changes. The example extension logs the current reading position whenever it changes:

```tsx
yield effect(() => {
  if (context.app.currentReadingState.value) {
    console.log("now reading:", context.app.currentReadingState.value.bookId);
  }
});
```

The audio-reader extension uses the same mechanism to stop playback the instant the user navigates to a different chapter, so a previous chapter's narration never keeps playing under the next one.

#### User feedback and other odds and ends

- `context.app.toast(message)` shows the same bottom-of-screen toast the core app uses.
- `context.sidebar.openChatPanel()` / `context.chats.selectChat(id)` — open the chat sidebar to a specific conversation (used by the apologist extension to jump straight to a restored conversation).
- `context.login`, `context.navigation`, `context.i18n`, and the rest of the managers from [§8.1](#81-the-apps-managers) are all available the same way.

### 8.4 Extensions vs. patterns

These are two different mechanisms and it's easy to conflate them because both live in this repo and both are "pluggable":

- An **extension** (`packages/*-extension/`, this guide) runs _inside_ the main Seed Bible app, in the same page, with full access to `SeedBibleState`. It's written the same way the app itself is (Preact/JSX/signals).
- A **pattern** (`patterns/`) is a separate CasualOS application — bot scripts packaged into a `.aux` file — that gets embedded as a _cross-origin_ `ao.bot` iframe via `<PortalComponent>`. It runs in its own sandboxed context with its own CasualOS runtime (`os`, `thisBot`, `configBot` globals), and it communicates with the host page only through the iframe boundary (query params in, and whatever CasualOS's cross-frame APIs allow).

The reason both show up together in the same example: a pane opened by an extension can embed a pattern. The locations extension does exactly this — it's an _extension_ (runs in the main app, reacts to verse selection) that opens a pane whose content is the `geo-importer` _pattern_ (a separate CasualOS map applet) to actually render the map. If you need custom code running inside a grid/map portal, you need a pattern; if you need to add a feature to the main app's UI or behavior, you need an extension. Patterns are out of scope for this guide — see `DEVELOPERS.md` for the basics of building one.

#### A note on overloaded terminology

You'll also encounter `context.readingExtensions` (backed by `BibleReadingExtensionManager`) in the app state. Despite the name, **this is not the plugin system described in this guide.** It's a narrower, session-level mechanism for customizing reading _navigation_ and _Discover content_ on a per-reading-state basis (e.g. hooking "what happens when the user hits next chapter," or transforming what Discover shows, with data that syncs within a shared session). If you're building a plugin that a user installs from the Settings page, you want `registerExtension` and the app-wide `context.tools`/`context.panes`/`context.discover` APIs covered above — not `readingExtensions`.
