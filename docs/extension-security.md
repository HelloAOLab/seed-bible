# Third-Party Extension Security Model

**Status:** Phase 1 (§9) is implemented; the later phases are still proposals. Where phase 1 ended up differing from the original plan, the text below says so, and §9 lists what it does and doesn't include. For how to write a sandboxed extension, see §7 of [`developer-guide.md`](./developer-guide.md).

**Short version:** Third-party extensions should stop running as ordinary scripts inside the Seed Bible page. Instead, each one runs in its own sandboxed iframe that can't see the page, the user's login, or any user data. The extension declares the permissions it needs in `extension.json`. The user approves them when installing. From then on, the extension can only reach the app by sending messages to a "broker" in the host page, and the broker checks every message against what the user approved. Extensions built inside this repo (first-party) keep working exactly as they do today.

This document builds on the extension system described in [`developer-guide.md`](./developer-guide.md), especially §3 (the two ways an extension reaches the app) and §8 (building an extension outside this repo).

---

## 1. The problem today

There are two ways an extension gets into the app (developer guide §3):

1. **Bundled**: the extension's source lives under `packages/`, is reviewed in a pull request, and is compiled into the app.
2. **Loaded from a URL**: `ExtensionManager.loadExtensionFromUrl` calls `import(url)` on any URL, and `seed-bible-extension-scripts publish` + `discoverExtensionSet(url)` make this a real distribution path for third-party developers.

Both paths end up in the same place: the extension's code runs in the Seed Bible page itself, and its `init(context)` receives the full `SeedBibleState`. That means a URL-loaded extension, written by anyone, can do everything the app can do. Concretely, it can:

- **Take over the user's account.** The CasualOS session key is stored in the page's `localStorage` under `"sessionKey"` (`LoginManager.tsx`), and is also reachable as `context.os.getSessionKey()`. Any script in the page can read it and send it anywhere. Whoever has that key _is_ the user until it expires.
- **Read and change all user data.** Highlights, notes, saves, bookmarks, reading history, reading plans, friends, chats, shared sessions: every manager is on `context`.
- **Change the page.** It can rewrite the DOM, draw a fake "please sign in again" dialog that looks exactly like the real one, or change the text of a Bible verse on screen.
- **Send data anywhere.** Nothing limits which servers it can `fetch`.

Before vs. now, in one sentence: _before_, installing a third-party extension was like handing someone your unlocked phone; _with this design_, it's like installing an app that has to ask before it can see your photos.

### What already points the right way

The **sensitive settings** system (`ExtensionSensitiveSettings.ts`, `extensionSettingConstraints.ts`) already does a small version of this design. An extension declares, in its manifest, which host its API keys may be sent to. The key is stored in a CasualOS proxy record. The extension calls `fetchWithSensitiveValues` and never sees the key itself. This proposal generalizes that idea — "declare it in the manifest, let the host hold the secret, give the extension a narrow way to use it" — to everything an extension touches.

---

## 2. Goals and non-goals

**Goals**

1. A third-party extension can't read the session key, cookies, or the app's `localStorage`, and can't call CasualOS as the user.
2. A third-party extension can't read or change the app's DOM. Its UI appears only inside areas the host draws a clear border around and labels with the extension's name.
3. A third-party extension gets no user data unless the user approved a permission that covers it.
4. Permissions are declared up front in `extension.json`, shown to the user in plain language at install time, and can be revoked later in Settings.
5. Updating an extension can't quietly add permissions. New permissions mean asking again.
6. Writing a sandboxed extension still feels like writing a normal Preact extension.

**Non-goals**

- **Protecting against first-party extensions.** Extensions in `packages/` are reviewed in pull requests and compiled into the app. Code review is their security control. They keep full access.
- **Stopping a determined extension from leaking data it was legitimately given.** If the user grants "read your highlights," a malicious extension can find a way to send them out (see §8). The protection is that it only gets the highlights if the user agreed.
- **Protecting against the user's own browser extensions or a compromised device.**

---

## 3. Two trust levels

Every extension is in exactly one of two tiers. The tier is decided by **where the code came from**, never by anything the extension says about itself.

| Tier            | Where it comes from                                                                                                                                        | How it runs                                       | Permissions                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| **First-party** | Compiled into the app by `vite-plugin-extensions.ts` from this repo's `packages/`                                                                          | In the page, as today, with full `SeedBibleState` | Optional `permissions` field is documentation only            |
| **Sandboxed**   | Anything loaded from a URL: `loadExtension({ meta, url })`, `discoverExtensionSet(url)`, `publish`ed extensions, and out-of-tree folders in `dev` (see §7) | In its own sandboxed iframe, through the broker   | Enforced: only what the manifest declares and the user grants |

The rule is simple on purpose: **an `UploadedExtension` (one with a `url`) is always sandboxed.** There is no "trust this URL" switch. If a third-party extension needs full access, the path is to contribute it to `packages/` where it gets reviewed.

---

## 4. How the sandbox works

### 4.1 The pieces

```
┌──────────────────────── Seed Bible page (app origin) ─────────────────────────┐
│                                                                               │
│   Managers / SeedBibleState  ◄──── Broker ────►  Host-drawn UI                │
│   (session key, user data)          │  ▲         (toolbar buttons, pane       │
│                                     │  │          frames, discover cards)     │
│                    MessagePort      │  │  MessagePort                         │
│              ┌──────────────────────┘  └───────────────────────┐              │
│   ┌──────────▼───────────┐                         ┌───────────▼──────────┐   │
│   │ Background frame     │                         │ View frame           │   │
│   │ (hidden iframe)      │                         │ (iframe inside pane) │   │
│   │ runs extension init: │                         │ renders the          │   │
│   │ registers tools,     │                         │ extension's Preact   │   │
│   │ providers, effects   │                         │ UI for one pane      │   │
│   └──────────────────────┘                         └──────────────────────┘   │
│        sandbox="allow-scripts"  — unique opaque origin, own CSP               │
└───────────────────────────────────────────────────────────────────────────────┘
```

- **Background frame.** One hidden iframe per installed sandboxed extension. It runs the extension's main code (the equivalent of today's `init`), for things that work without a visible UI: registering a toolbar button, answering Discover or chat requests, reacting to navigation. This is like the background page of a browser extension.
- **View frames.** When the extension opens a pane (or a modal, a settings panel, or a custom Discover card), the host creates a new iframe in that spot and loads the extension's code in "view" mode, rendering one named view. One extension can have several view frames open at once.
- **The broker.** Code in the host page (a new `ExtensionSandboxManager`) that owns every frame, receives every message from them, checks permissions, and calls the real managers. **The broker is the security boundary.** Everything else is plumbing.

### 4.2 Why an iframe, and which kind

The iframe is created with `sandbox="allow-scripts"` and **without** `allow-same-origin`. That gives the frame a unique "opaque" origin — the browser treats it as a website with no address, unrelated to Seed Bible and to every other frame. In practice:

- It can't read the app's `localStorage`, cookies, or IndexedDB, so the session key is out of reach.
- It can't touch `window.parent.document`, so it can't read or change the app's DOM.
- It can't navigate the top-level page, open popups, or submit forms, because those `sandbox` flags aren't granted.
- Two extensions can't see each other, because each frame's opaque origin is different.

Alternatives considered:

| Option                                                                   | Why not (for now)                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web Worker**                                                           | Workers have no DOM, so the extension couldn't render its own UI. Every pane would have to be described as data for the host to draw, which rules out most real extensions (the map, the transcript viewer, Twitch settings).                                                                     |
| **In-page JavaScript sandbox** (SES / Compartments, ShadowRealm)         | Still shares the page's DOM, so UI isolation would need a second mechanism anyway. ShadowRealm isn't shipped in browsers. SES's `lockdown()` changes built-ins for the whole page and is a large, risky change to the core app.                                                                   |
| **Dedicated cross-site origin** (e.g. `<hash>.seedbible-extensions.net`) | Stronger in two ways: the browser puts it in a separate process (so a crashing or spinning extension can't freeze the reader), and each extension gets its own real storage. But it needs a new domain, wildcard DNS and TLS, and a server route. **Recommended as phase 4** (§9), not a blocker. |

The opaque-origin iframe needs no new infrastructure: the host builds the frame's HTML itself (as a `srcdoc` string) and can ship in phase 1.

### 4.3 Loading the code

1. The host fetches the extension's bundle from the URL in its manifest.
2. It checks the bundle against an `integrity` hash pinned in the manifest (`sha384-…`, the same format as HTML's subresource integrity). If it doesn't match, the extension doesn't load. This stops someone from swapping the code at that URL after the user approved it.
3. It writes the frame's HTML: a tiny fixed bootstrap script, plus a `<meta http-equiv="Content-Security-Policy">` tag. A CSP (Content Security Policy) is a list of rules the browser enforces on a page — what it may load and which servers it may contact. Here the policy only lets the frame reach the hosts the user approved (§5): requests, images, media and fonts from anywhere else are refused. The bootstrap receives the verified bundle over the channel in step 4 and loads it from a `blob:` URL.

   _As built:_ the policy allows inline and `blob:` scripts rather than pinning one script by its hash, as first planned. Pinning would add nothing: the extension's own code already runs in the frame, so it could always run more. What the policy has to limit is where data can go, and that part is strict.

4. It hands the frame one end of a `MessageChannel` (a private two-way pipe). All further communication goes over that pipe, never over `window.postMessage` broadcast, so the broker never has to guess which frame a message came from. (Opaque-origin frames all report their origin as `"null"`, so origin checks alone can't tell them apart.)

The extension bundles its own copy of Preact and `@preact/signals`. This is fine now, unlike today's `--standalone` bundles: the "two Preact instances" problem only exists when two copies share one component tree, and a sandboxed extension's tree lives entirely inside its own frame.

_As built:_ a sandboxed extension is known by where it's hosted and the id its manifest declares, joined by `#`, like `https://example.com/extensions/#verse-art`. Where it's hosted is the bundle URL's folder, the same thing a grant is tied to. Everything kept per extension (its `sb.storage`, its `sb.identity`, the notes it added, its grant, the set it came from, its tools' ids) is kept under that id. So an extension hosted somewhere else that declares the same id is a different extension: installing it asks again, and it starts with none of the first one's data. Settings shows the declared id next to the folder it's hosted in.

### 4.4 What the extension code looks like

A new SDK entry point, `seed-bible/extensions`, replaces direct access to `SeedBibleState`. It looks like today's API, but every call that reaches user data is `async` (it's a message to the broker and a reply), and app state arrives as read-only signals that the broker keeps up to date.

```tsx
import { defineExtension } from "seed-bible/extensions";
import { effect } from "@preact/signals";

export default defineExtension({
  // Runs once, in the extension's hidden background frame.
  main: async (sb) => {
    // UI contribution: the host draws the button; the click comes back as an event.
    await sb.tools.registerToolbarTool({
      id: "my-tool",
      title: { key: "tool-title", defaultValue: "My Tool" },
      icon: { svg: "<svg viewBox='0 0 24 24'>…</svg>" },
      onSelect: () =>
        void sb.panes.open({
          view: "main",
          placement: "side",
          title: "My Tool",
        }),
    });

    // Needs the `reading:position` permission; otherwise it stays null.
    effect(() => {
      const pos = sb.reading.position.value;
      if (pos) console.log("now reading", pos.bookId, pos.chapterNumber);
    });

    // Needs `reading:navigate`; without it this rejects with a
    // SandboxError whose code is "permission_denied".
    await sb.reading.open({ bookId: "JHN", chapter: 3 });
  },

  // Each view is rendered in its own frame, inside the pane the host opened.
  views: {
    main: ({ sb }) => <div>Hello from a sandboxed pane</div>,
  },
});
```

Functions passed to the host (like `onSelect`) never leave the frame. The SDK keeps them in a table, sends the host an ID, and the host sends an "invoke this ID" event back when the user clicks.

The extension's own cleanup gets simpler too: **the host owns every registration**, so on uninstall (or revoke, or crash) the host removes the extension's buttons, providers and panes itself and then deletes the frames. The extension can't forget to clean up, and a misbehaving extension can't refuse to.

### 4.5 How each extension point maps over

| Today (`SeedBibleState`)                                                           | Sandboxed equivalent                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools.registerToolbarTool`, `…VerseToolbarTool`, `…QuickTool`, `…BelowReaderTool` | Same shape, but declarative. `icon` is an SVG string the host renders as an `<img src="data:image/svg+xml…">` (SVG inside an `<img>` can't run scripts) or a name from the app's own icon set. `isVisible` becomes a value the extension sets (`tool.setVisible(true)`), not a function the host calls on every render. `getItems` becomes an async call that returns plain data. |
| `panes.openPane({ component })`                                                    | `sb.panes.open({ view, placement, title })`. The host draws the pane's frame and title bar, labelled with the extension's name, and puts a view frame inside.                                                                                                                                                                                                                     |
| `discover.registerDiscoverProvider`                                                | Same, but `discover()` is an async call with a timeout (say 5 s). Results are plain data the host renders (cross-references, text). A custom content type is a view frame sized to its content.                                                                                                                                                                                   |
| `chats.registerProvider`                                                           | Same, with `generateResponse` as an async call. Needs `chat:respond`, which means the extension sees the messages of the conversations it's added to (and the prompt says so).                                                                                                                                                                                                    |
| `modals.openModal`                                                                 | Either a host-drawn text-only dialog, or a view frame inside a modal whose title bar names the extension. Never a full-screen overlay with no host frame — that's how a fake sign-in dialog would work.                                                                                                                                                                           |
| `app.toast`                                                                        | Text only, rate-limited, shown with the extension's name.                                                                                                                                                                                                                                                                                                                         |
| `extensionSettings.getValue`, `meta.settings`                                      | Unchanged and needs no permission: an extension can always read its own non-sensitive settings.                                                                                                                                                                                                                                                                                   |
| `extensionSettings.fetchWithSensitiveValues`                                       | Unchanged, and already safe: the broker forwards the request through the CasualOS proxy record, and the secret never enters the frame.                                                                                                                                                                                                                                            |
| `extensions.registerSettingsPanel`                                                 | A view frame on the extension's Settings tab.                                                                                                                                                                                                                                                                                                                                     |
| `PortalComponent` (embedding an `ao.bot` pattern)                                  | A pane the host draws, with the `ao.bot` iframe in it, needing `embed:casualos`. _As built:_ the host renders the portal itself (`sb.portals.open`), not the view frame: a frame nested inside the sandbox inherits its flags and opaque origin, and `ao.bot` doesn't run there.                                                                                                  |
| Theme and language                                                                 | Pushed into every frame automatically: the `--sb-*` CSS variables, light/dark mode, the current language and text direction. Sandboxed UI matches the app without asking for anything.                                                                                                                                                                                            |
| `context.os`, `context.login` (session), raw managers                              | **Not available, ever.** There is no permission that grants them.                                                                                                                                                                                                                                                                                                                 |

### 4.6 What a sandboxed extension always gets, without asking

These are safe enough to give every extension, so the install prompt stays short:

- Registering UI contributions (buttons, panes, Discover providers). The user sees all of these, and they're labelled.
- Its own settings (non-sensitive) and brokered use of its sensitive settings.
- **Its own storage:** `sb.storage.get/set`, a small key/value store kept for it by the host (namespaced by extension ID, with a size limit). This replaces `localStorage`, which an opaque-origin frame can't use.

  _As built:_ the store is kept on the device and, while the user is signed in, synced to a private record in their account (`extensionStorage/<extension id>`, readable only by them), so it follows them to other devices. Devices are merged key by key, and the newer write wins. Deleted keys are remembered for 90 days so an older copy can't bring them back. Each write re-reads the account's copy before saving, so two devices changing different keys don't undo each other. Signed-out use stays on the device, and each account's copy is kept apart, so one person's extension data never ends up in another's account on a shared device. Uninstalling clears the account's copy by recording when it was cleared, so other devices drop their stale copies when they next sync.

- **A pseudonymous user ID:** `sb.identity.id`, a hash of the real user ID and the extension ID. It lets an extension keep per-user data on its own server without learning who the user is, and it's different for every extension, so two extensions can't combine what they know about the same person.
- Theme, language, and whether the device is mobile.
- Reading Bible text through the app's Bible API (public data).

_As built:_ all of these are available. The pseudonymous id is `sb.identity` (null when signed out); Bible text is `sb.bible.chapter()`; brokered sensitive requests are `sb.sensitive.fetch()`. Discover providers do need `reading:position`, since each request a provider gets says which chapter is open (§5.2).

---

## 5. Permissions

### 5.1 Declaring them

Permissions go in `extension.json`, next to the existing `settings` and `sensitive` fields:

```json
{
  "id": "verse-art",
  "version": "1.2.0",
  "translations": { "en": { "title": "Verse Art", "description": "…" } },
  "permissions": ["reading:position", "reading:selection", "highlights:read"],
  "optionalPermissions": ["highlights:write"],
  "network": ["api.verse-art.example"],
  "integrity": "sha384-…"
}
```

- **`permissions`** are required. The user approves all of them at install, or the extension isn't installed.
- **`optionalPermissions`** can be requested later, at the moment they're needed, with `await sb.permissions.request("highlights:write")`. This keeps the install prompt short and lets the user say yes to the extension but no to one feature of it. The install dialog lists them under "Later, it may ask to", so a later request isn't a surprise.

  _As built:_ the request resolves `true` only if everything asked for is granted. It shows a prompt only when the host can see the user is interacting with that extension: the browser reports a click or key press in the last few seconds (`navigator.userActivation`), and it was on one of the extension's own tools, or the user is inside one of its frames (the frame has focus). Clicks elsewhere in the app don't count, and neither does anything the frame claims about itself. Otherwise the request rejects. Only one request can be open at a time. Once the user declines a permission, later requests for it resolve `false` without asking, until the page reloads. A granted optional permission is saved with the grant, kept through updates that still list it, and forgotten on uninstall. A permission listed as both required and optional counts as required. `network` hosts can't be optional, because a frame's CSP is fixed when it's created.

- **`network`** lists every host the extension may contact with `fetch`. It goes into the frame's CSP. Hosts already named in the `sensitive` section don't need repeating.
- **`integrity`** pins the bundle (§4.3). `publish` fills it in.
- **`icon`** is a link to a square image shown in place of the extension's initials. It may be relative to the set, and is kept only if it resolves to an `https:` link (or `http://localhost` while developing); anything else is dropped. It's shown with an `<img>`, so it can't run code, and fetching it tells the extension's host no more than fetching the set and bundle already does. `publish` uploads it to its own link in Seed Bible's storage.
- **`version`** is also new (today's `ExtensionMeta` has none). Grants are recorded against it, so the host can tell an update apart from the version the user approved (§6.3).

The manifest that counts is the one in the hosted `ExtensionSet`, which the host reads _before_ running any code. The bundle can't ask for anything that isn't in it.

### 5.2 The permission list

_As built:_ twenty permissions, listed in `SANDBOX_PERMISSION_INFO` (`extensions/protocol.ts`). Each has a risk level and a policy saying whether a manifest may **require** it (list it under `permissions`, so the extension doesn't install without it) or whether it's **always optional** (only ever under `optionalPermissions`, asked for when the feature that needs it is used).

**The rule: an extension may require what it reads about the user's reading — the passage, the selection, their reading history, highlights and saves — and the low-risk actions the user starts themselves: reading aloud, copying, showing a CasualOS view. Anything that changes the user's data, identifies them, reads their private writing, involves other people, or uses the microphone or camera is always optional.** High-risk permissions are exactly the always-optional ones, and the consent dialog tags them **Sensitive**.

| Permission          | What it allows                                                                         | How the dialog describes it (en)                             | Risk   | Can be required |
| ------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | --------------- |
| `reading:position`  | The current translation/book/chapter, kept up to date; registering Discover providers  | "See which passage you're reading"                           | Low    | Yes             |
| `reading:selection` | The selected verses, and the selection in a tool's `onSelect`                          | "See which verses you select"                                | Low    | Yes             |
| `reading:navigate`  | Open a passage                                                                         | "Open passages"                                              | Low    | Yes             |
| `reading:history`   | Reading history, up to a year at a time                                                | "See your reading history"                                   | Medium | Yes             |
| `highlights:read`   | The user's highlights, a chapter at a time                                             | "See your highlights"                                        | Medium | Yes             |
| `highlights:write`  | Add and remove highlights, in the theme's colors (includes `highlights:read`)          | "Add and remove your highlights"                             | High   | No              |
| `notes:read`        | The user's notes, as plain text                                                        | "Read your notes"                                            | High   | No              |
| `notes:write`       | Add notes; change or delete only the ones it added (includes `notes:read`)             | "Add notes, and change or delete the ones it added"          | High   | No              |
| `saves:read`        | The user's saves                                                                       | "See your saves"                                             | Medium | Yes             |
| `saves:write`       | Add and remove saves (includes `saves:read`)                                           | "Add and remove your saves"                                  | High   | No              |
| `profile:read`      | The user's name, picture and real account id                                           | "See your name and profile picture"                          | High   | No              |
| `chat:respond`      | Be a chat participant; sees the messages of chats the user adds it to                  | "Read and reply to chats you add it to"                      | Medium | Yes             |
| `chat:shared`       | Also take part in shared chats, with other people's messages (includes `chat:respond`) | "Read other people's messages in shared chats you add it to" | High   | No              |
| `friends:read`      | The friends list: names and pictures, with pseudonymous ids                            | "See who your friends are"                                   | High   | No              |
| `session:read`      | Who's in the shared reading session open in the current tab                            | "See who's in the shared reading sessions you join"          | High   | No              |
| `audio:playback`    | The app's audio player: its own files, recorded narration, and text-to-speech          | "Play audio and read passages aloud"                         | Low    | Yes             |
| `clipboard:write`   | Copy text to the clipboard                                                             | "Copy text to your clipboard"                                | Low    | Yes             |
| `embed:casualos`    | Show `ao.bot` grid and map portals in panes                                            | "Show CasualOS maps and grids"                               | Low    | Yes             |
| `device:microphone` | One recording at a time, through a dialog the host shows                               | "Record audio with your microphone, when you press Record"   | High   | No              |
| `device:camera`     | One photo at a time, through a dialog the host shows                                   | "Take photos with your camera, when you press Take photo"    | High   | No              |
| _(network hosts)_   | Requests and images from the listed hosts                                              | "Connect to api.verse-art.example"                           | —      | Required only   |

Why these defaults:

- **Required means "the extension is pointless without it."** A verse-art extension really can't work without the selection, and a chat bot can't work without seeing the chat. Asking at install, once, is the honest version of that.
- **`chat:respond` can be required** even though it reads messages, because it only ever sees chats the user adds it to: that choice is made in the moment, chat by chat.
- **Reading notes is always optional**, unlike reading highlights or saves: notes are the user's own writing, often private reflection.
- **`profile:read` is always optional.** Most extensions that want "per-user" data only need `sb.identity` (§4.6), which needs no permission and isn't the user's real id.
- **Write permissions include read.** Granting `highlights:write` also grants `highlights:read`; taking back `highlights:read` in Settings also takes back `highlights:write`.
- **Reading position gates Discover providers,** because every request a provider gets says which chapter is open.
- **Highlights are `publicRead` in CasualOS today, but still need a permission.** Inside the app, the extension would learn which public highlights belong to _this_ user. That link is the private part.
- **Only notes are marked with the extension that wrote them** (a `extension:<id>` tag), which is what lets an extension change or delete its own notes and no one else's. Highlights and saves have no field to carry a mark, so `highlights:write` and `saves:write` cover all of them; that is part of why they're always optional.

- **People are never identified by their real ids.** Friends and session participants get the same kind of pseudonymous id as `sb.identity`, so an extension can tell people apart, and even match a friend to the `sb.identity` that same person's copy of the extension sees, without learning who anyone is. Friends and sessions are still always optional: who someone knows, and who they read with, is about other people who never agreed to anything.
- **The microphone and camera go through the host, not the frame.** The original plan was to add `allow="microphone"` to the extension's frames. That doesn't work: browsers only allow `getUserMedia` in a page with a real (non-opaque) origin, and a sandboxed frame's is opaque. Tested in Chromium, it fails with "Invalid security origin" either way. So the host opens the device itself, in a dialog titled with the extension's name; nothing is captured until the user presses the dialog's button, and the extension gets only the finished recording or photo, never a live stream. That rules out real-time uses (live transcription, video calls), which would need phase 4's real origins.
- **Actions the user starts need them to have just interacted with the extension:** starting or resuming audio, copying, recording and taking photos, like dialogs and permission requests (§5.1).
- **Audio goes through the app's player,** so whatever an extension plays shows in the reader's own playback controls, where the user can always pause or stop it, and it ends when the user plays something else there or closes the tab. An extension can only pause, seek or stop what it started itself. Audio files load in the app's page, so they must come from the manifest's `network` hosts, like Discover images.
- **A CasualOS portal runs outside the sandbox.** `embed:casualos` opens an `ao.bot` iframe the host draws, like `PortalComponent` does for built-in extensions, so the pattern runs on `ao.bot` with whatever `ao.bot` can do in this browser. The extension can't change which instance or pattern loads through `query`, and it can only message portals it opened. It's low risk for Seed Bible's own data, which `ao.bot` can't reach, but the pattern itself isn't reviewed by anyone.

### 5.3 Never available to sandboxed extensions

No permission grants these, and the broker has no message type for them:

- The session key, `context.os`, or any raw CasualOS client.
- Signing in or out, changing the account email, deleting the account.
- Installing, uninstalling or reconfiguring other extensions, or reading their data or settings.
- Writing arbitrary CSS into the app, or anything that draws outside a host-drawn frame.
- Changing the app's own settings, theme, or Customizations.

---

## 6. Asking the user

### 6.1 At install

The install button in Settings → Extensions opens a dialog _before_ any of the extension's code runs:

> **Install "Verse Art"?**
> Version 1.2.0 · from **verse-art.example**
>
> _Seed Bible hasn't reviewed this extension. It runs separately and only gets what's listed here._
>
> **Right away**
>
> - **Your reading:** See which passage you're reading · See which verses you select
> - **The internet:** Connect to **api.verse-art.example**
>
> **Only if you agree later**
>
> - **Your highlights, notes and saves:** Add and remove your highlights `Sensitive`
>
> Cancel (on the left) · **Install** (on the right)

Permissions are grouped into cards by what they reach (your reading; your highlights, notes and saves; you and other people; audio and maps; your device; the internet), so the list reads as a few areas rather than a long list of lines. High-risk permissions carry a **Sensitive** tag. The source line comes from the bundle URL's host, so a user can see that "Official Bible Tools" is actually served from somewhere unexpected. A bundle in Seed Bible's own file storage (as `publish` uploads it) is the exception: that host tells a user nothing, so the line names the uploader instead, from the public profile of the account the file is stored under, or "a Seed Bible User" when they haven't set a name, with their profile picture before it when they have one and a badge after it: **Friend**, **Not a friend** or **You** (none until the viewer's friends list has loaded). The records server is asked whether a URL is its own storage (`getFile`), rather than the host being matched, and if it can't be asked the host is shown. That name is chosen by the uploader, so it says who, not that they're trustworthy. An update lists only what's new, under "New in this version". A request while running gets its own layout: the extension's tile pointing at icons for what it wants, a sentence naming it ("Verse Art wants access to your highlights", or a list when it asks for several, with a count of how many are sensitive), what it will be able to do, and the sensitive things it still won't be able to (up to three it doesn't have, related ones first), with **Not now** and **Allow**. A single request also lists what's already allowed. The answer covers everything requested: there's no granting part of a request.

### 6.2 Where the approval is stored

Grants are saved per extension as `{ extensionId, version, granted: string[], grantedAt }`. They're stored and synced the same way installed extension IDs already are — `localStorage` plus the user's profile, merged with timestamps (`mergeInstalledExtensionIds`) — so approving on one device carries to the others, and revoking on one isn't undone by another.

### 6.3 Updates

When a new version's manifest asks for nothing new, it updates silently. When it asks for anything new (a new permission or a new network host), the new version doesn't load. The old version keeps running if its pinned bundle is still available; otherwise the extension is paused. The user sees a "Verse Art wants new permissions" notice listing only what's new. This is how Chrome handles extension updates.

### 6.4 Revoking

Settings → Extensions gets a "Permissions" section per sandboxed extension, with a toggle per permission (required ones can't be turned off without uninstalling). Revoking tears down the extension's frames, removes everything it registered, and restarts it with the smaller set.

_As built:_ every extension in Settings → Extensions has its own page (the list's rows have no buttons; a row opens the page). Before it's installed, the page shows what the extension can do, in the install dialog's cards, and an **Install** button. Once it's installed, the page has tabs: **About** (with **Uninstall**), **Settings** when it has any, and, for a sandboxed extension that's running, **Permissions**, in the same cards as the install dialog: what it needs to work at all, and the hosts it can contact, are marked **Needed** with a lock, and each optional permission has a switch. Turning one on or off saves the change with the grant and restarts the extension with exactly the new set, and a banner above the cards confirms it (or says it didn't save). Uninstalling is the only way to take away something Needed.

On a computer, Settings → Extensions opens a full-screen Extensions page instead (`?extensions=open`, and `&extension=<id>` while one extension's page is showing). It lists the same extensions as cards, filtered by All, Installed or Available and by who made them (Seed Bible, or others from a link), and each card opens that extension's page, laid out across the screen: **Install** (or **Uninstall**) sits beside its name, and an installed extension's About, Permissions and Settings tabs run down the side. On a phone the list stays in Settings, since there's no room beside the sidebar.

### 6.5 Installs that don't come from the user clicking Install

Two existing features install extensions without that click, and both have to stop at the consent dialog for sandboxed extensions:

- **`?autoinstall-<id>=true` URL parameters.** For a sandboxed extension, a link like this must only _offer_ the install (open the dialog), never perform it. Otherwise anyone could send a link that silently installs their extension.
- **Customizations with `auto-installed` extensions** (`CustomizationsManager.activeExtensionIds`). A shared `?customization=` link can name extensions to install. For sandboxed ones, the customization shows the consent dialog the first time it's applied.

`autoinstall: true` in a manifest is ignored for sandboxed extensions.

_As built:_ both stop at the consent dialog. A third kind of link, `?extensionSet=<url>`, lists a hosted set's extensions for that visit, as adding the link in Settings does; with `autoinstall-<id>=true` it opens that extension's consent dialog, never more. Since the link names the set, `<id>` there can be the id an extension in that set declares; without `?extensionSet=`, a sandboxed extension is only offered for its full id, which includes where it's hosted (§4.3). Sets load only over `https:` (or from `localhost`, for development) and without cookies. Once the user installs an extension from a set, the set's URL is remembered (on the device and in the profile config) so the extension loads again on later visits and other devices; uninstalling forgets it.

---

## 7. Developer experience

- **`create-seed-bible-extension`** generates the sandboxed shape by default: `defineExtension` from `seed-bible/extensions`, a `permissions` array in `extension.json`, and a test that mocks the SDK's broker rather than `SeedBibleState`.
- **`seed-bible-extension-scripts dev`** runs out-of-tree extensions in the sandbox by default, so a developer runs into a missing permission on their own machine, not in a user's bug report. A `--trusted` flag keeps today's in-page behavior for someone preparing a contribution to `packages/`. The dev server shows the consent dialog once and remembers it for that project.
- **`check`** warns when code calls an SDK method whose permission isn't declared (it's a fixed list of method → permission, so this can be a simple type-level check: SDK namespaces for undeclared permissions are typed as `never`).
- **`build --standalone`** produces the sandbox bundle. The `window.__seedBibleExtensionRuntime` shims are no longer needed for sandboxed extensions and can be retired once nothing uses them.
- **Errors are clear.** A call without permission rejects with `PermissionDeniedError("highlights:read is not granted")`, not a silent `undefined`.

_As built (phase 3):_

- The scaffold is sandboxed, and its test uses `createTestHost` from `seed-bible/extensions/testing`, which runs the extension through the real SDK against a stand-in for the app, checking every call against the permissions the test grants. The permission each call needs is one table in the protocol (`SANDBOX_METHOD_PERMISSIONS`), read by the host, the test host and the tooling, so they can't disagree.
- `dev` serves the extension from `localhost`, as a URL extension, with an always-current `ExtensionSet`, and opens the app with an `?extensionSet=` link; the consent dialog is shown once, and the grant is remembered like any other. There's no `--trusted` flag: a project written with `registerExtension` is still put into the app's build as before, and one that imports `seed-bible/extensions` always runs sandboxed.
- `check` reads the code for `sb.*` calls and reports a call whose permission isn't declared as an error, and a declared permission nothing uses as a warning. It reads text rather than types: typing undeclared namespaces as `never` would need the SDK's types generated per project.
- `build` produces the sandbox bundle for a sandboxed project without `--standalone`, deduplicating Preact so a project on a different version than Seed Bible's still works.
- A view that fails to load or render is reported in the console with the extension's id, rather than leaving a blank pane.

---

## 8. What this does and doesn't protect against

| Threat                                             | Protected? | How / why not                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stealing the session key / taking over the account | **Yes**    | The key lives on the app origin; the frame's opaque origin can't read it, and no broker message returns it.                                                                                                                                                                                                                                        |
| Reading data the user didn't grant                 | **Yes**    | The data simply never enters the frame. The broker checks every request.                                                                                                                                                                                                                                                                           |
| Changing the app's UI, faking a sign-in dialog     | **Yes**    | The frame can't reach the parent DOM. Its UI only appears in host-drawn, labelled frames.                                                                                                                                                                                                                                                          |
| Sneaking new permissions in through an update      | **Yes**    | Permissions come from the manifest; new ones need re-approval; the bundle is pinned by hash.                                                                                                                                                                                                                                                       |
| Installing itself through a shared link            | **Yes**    | Link-driven installs of sandboxed extensions always show the consent dialog (§6.5).                                                                                                                                                                                                                                                                |
| Sending _granted_ data to an undeclared server     | **Partly** | The CSP blocks `fetch` and similar requests to undeclared hosts. But browsers don't fully stop a frame from leaking data — for example, it can navigate itself to an attacker's URL with the data in the address. So treat the network list as "what the extension says it talks to," and treat _what data it was granted_ as the real protection. |
| Freezing the app with an infinite loop             | **Partly** | An opaque-origin frame usually shares the page's process. The broker sends a heartbeat and removes frames that stop answering, but a tight loop can still stall the page briefly. The dedicated-origin option (phase 4) fixes this with a separate process.                                                                                        |
| A malicious _first-party_ extension                | **No**     | Out of scope by design; code review in `packages/` is the control.                                                                                                                                                                                                                                                                                 |

---

## 9. Rollout plan

Each phase is shippable on its own.

1. **Sandbox runtime and the basics — done.** What shipped:
   - `ExtensionSandboxManager.tsx`: the frames, the `MessageChannel` per frame, and the broker, which validates every message against a `zod` schema and checks it against the grant.
   - `seed-bible/extensions`: the SDK (`defineExtension`, `sb.*`).
   - Toolbar, verse, quick and below-reader tools; panes and their view frames; toasts; per-extension storage; the extension's own non-sensitive settings; theme, language and direction pushed into every frame.
   - The `reading:position`, `reading:selection` and `reading:navigate` permissions, and `network` hosts enforced by the frames' CSP.
   - `integrity` pinning, and the install consent dialog. Grants are stored and synced like installed extension IDs, are tied to where the bundle is hosted, and are revoked on uninstall.
   - Every `UploadedExtension` now runs sandboxed. The in-page `import(url)` path and the `window.__seedBibleExtensionRuntime` global it needed are gone.
   - `autoinstall` is ignored for sandboxed extensions, and an `?autoinstall-` link or a Customization only opens the consent dialog (§6.5).
   - Moved forward from phase 3, because without them no one could build a sandboxed extension: `build --standalone` produces a single-file sandbox bundle, and `publish` adds `integrity` (plus `version`, `permissions` and `network`) to the manifest.

   Not in phase 1, and moved to phase 2:
   - Discover providers, chat providers, extension-drawn modals and custom settings panels.
   - Brokered sensitive fetch.
   - The frame heartbeat (§8).
   - Loading Google Fonts inside frames: they get the theme's colors, but its fonts fall back to the system font.
   - Syncing `sb.storage` across devices: it is kept on the device for now.

   A sandboxed extension that declares `dependencies` is refused for now.

   Added since, ahead of the original plan: `optionalPermissions` and `sb.permissions.request` (§5.1).

2. **User data permissions — done.** What shipped:
   - Ten more permissions, with the "can be required" policy in §5.2: high-risk ones are always optional, and a manifest that lists one under `permissions` is refused with a message saying to move it.
   - `sb.highlights`, `sb.notes`, `sb.saves`, `sb.history` and `sb.profile`. Writes that need an account fail with `unavailable` when signed out, rather than prompting the user to sign in. Notes are read and written as plain text; anything an extension writes is escaped, never inserted as HTML. Highlight colors are limited to the theme's.
   - Discover providers (`sb.discover`, needing `reading:position`), with results as data the host renders. A result's image only loads from one of the manifest's `network` hosts, since it loads in the app's page.
   - Chat providers (`sb.chats`), needing `chat:respond`, plus `chat:shared` for shared chats; checked again on every message. A reply is a single text message, and an extension that doesn't answer within 60 s stays quiet.
   - Dialogs (`sb.modals`, a message or a view, titled with the extension's name, only right after the user interacts with it, one at a time) and a panel on the extension's Settings tab (`sb.settings.registerPanel`).
   - Brokered sensitive fetch (`sb.sensitive.fetch`), the pseudonymous `sb.identity`, and public Bible text (`sb.bible.chapter`).
   - The heartbeat (§8): an extension whose background frame misses two checks in a row is stopped for the rest of the visit, and the user is told.
   - The app's fonts inside frames (their CSP allows Google Fonts' two hosts and nothing else new).
   - The Permissions view in Settings (§6.4).

   - Syncing `sb.storage` across devices (§4.6).

   - The rest of the original permission list (§5.2): `friends:read`, `session:read`, `audio:playback`, `clipboard:write`, `embed:casualos`, `device:microphone` and `device:camera`. The microphone and camera work through a host-drawn capture dialog rather than in the frame, which browsers don't allow.

   Not built in phase 2: marking highlights and saves with the extension that made them (only notes have a field for it), and live microphone or camera streams.

3. **Tooling — done.** What shipped (details in §7):
   - Users can add a published extension from its link in Settings → Extensions, or through a `?extensionSet=` link, and the app remembers where an installed one came from. Before, nothing in the UI could add one, and an installed one was skipped on the next page load.
   - `seed-bible/extensions/testing` (`createTestHost`), the sandboxed scaffold, permission checks in `check`, and a sandboxed `dev`.
   - `packages/sandboxed-example-extension`: the example extension ported to the SDK, with tests. Everything ported except its export to other extensions, which needs phase 4's message-based exports. The app's build skips sandboxed packages rather than bundling them with full access.
   - Fixes found by running `dev` end to end in a browser (see §7), and `publish` now keeps `settings` and `sensitive` in the manifest it uploads.

   Not built: a type-level permission check, and porting a second, larger extension.

4. **Stronger isolation (optional).** Move frames to a dedicated cross-site origin, one subdomain per extension: separate process, real per-extension storage, and an `Origin` header third-party APIs recognize (an opaque-origin frame sends `Origin: null`, which some APIs' CORS settings reject). Also: extension-to-extension calls brokered by the host (today's `dependencies` share live objects, which can't cross a frame boundary; for sandboxed extensions they'd become declared, message-based exports).

---

## 10. Open questions

1. **Should reading position need a prompt?** This proposal says yes (it's private), at the cost of a prompt line for nearly every extension. The alternative is to grant it by default and only prompt for stored user data.
2. **Should sandboxed extensions be allowed to depend on first-party ones?** It would need each first-party extension to define an explicit, message-safe API. Until then, sandboxed extensions can only depend on other sandboxed ones (phase 4), or none.
3. **Domain for phase 4.** It must be a different registrable domain from the app (not a subdomain of it) to get process isolation and keep cookies separate.
4. **A reviewed catalog.** A list of third-party extensions the team has looked at could show "reviewed" instead of "not reviewed" in the install dialog. That's a policy question more than a technical one.
