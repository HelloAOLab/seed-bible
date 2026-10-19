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
| `extensions.registerSettingsPanel`                                                 | A view frame inside the Configure dialog.                                                                                                                                                                                                                                                                                                                                         |
| `PortalComponent` (embedding an `ao.bot` pattern)                                  | The view frame embeds the `ao.bot` iframe itself; needs the `embed:casualos` permission so the frame's CSP allows it.                                                                                                                                                                                                                                                             |
| Theme and language                                                                 | Pushed into every frame automatically: the `--sb-*` CSS variables, light/dark mode, the current language and text direction. Sandboxed UI matches the app without asking for anything.                                                                                                                                                                                            |
| `context.os`, `context.login` (session), raw managers                              | **Not available, ever.** There is no permission that grants them.                                                                                                                                                                                                                                                                                                                 |

### 4.6 What a sandboxed extension always gets, without asking

These are safe enough to give every extension, so the install prompt stays short:

- Registering UI contributions (buttons, panes, Discover providers). The user sees all of these, and they're labelled.
- Its own settings (non-sensitive) and brokered use of its sensitive settings.
- **Its own storage:** `sb.storage.get/set`, a small key/value store kept for it by the host (namespaced by extension ID, with a size limit). This replaces `localStorage`, which an opaque-origin frame can't use.
- **A pseudonymous user ID:** `sb.identity.id`, a hash of the real user ID and the extension ID. It lets an extension keep per-user data on its own server without learning who the user is, and it's different for every extension, so two extensions can't combine what they know about the same person.
- Theme, language, and whether the device is mobile.
- Reading Bible text through the app's Bible API (public data).

_As built in phase 1:_ the pseudonymous ID, Discover providers, brokered sensitive settings and the Bible API are not available yet. Until the Bible API is, an extension can declare the API's host under `network` and fetch from it directly.

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
- **`optionalPermissions`** can be requested later, at the moment they're needed, with `await sb.permissions.request("highlights:write")`. This keeps the install prompt short and lets the user say yes to the extension but no to one feature of it. (The request has to come from a click inside the extension's UI, so an extension can't pop up prompts on its own.)
- **`network`** lists every host the extension may contact with `fetch`. It goes into the frame's CSP. Hosts already named in the `sensitive` section don't need repeating.
- **`integrity`** pins the bundle (§4.3). `publish` fills it in.
- **`version`** is also new (today's `ExtensionMeta` has none). Grants are recorded against it, so the host can tell an update apart from the version the user approved (§6.3).

The manifest that counts is the one in the hosted `ExtensionSet`, which the host reads _before_ running any code. The bundle can't ask for anything that isn't in it.

### 5.2 The permission list

Risk levels decide how the install prompt presents each permission. "Low" ones are grouped into one line; "High" ones are listed individually with a warning.

| Permission                           | What it allows                                                                         | How the prompt describes it (en)                  | Risk       |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------- |
| `reading:position`                   | Read the current translation/book/chapter, and get updates when it changes             | "See which passage you're reading"                | Low        |
| `reading:selection`                  | Read which verses are selected                                                         | "See which verses you select"                     | Low        |
| `reading:navigate`                   | Open a passage, add or switch tabs                                                     | "Open passages and tabs"                          | Low        |
| `audio:playback`                     | Use the app's audio player and text-to-speech                                          | "Play audio"                                      | Low        |
| `reading:history`                    | Read reading history and reading-plan progress                                         | "See your reading history and reading plans"      | Med        |
| `highlights:read`                    | Read the user's highlights                                                             | "See your highlights"                             | Med        |
| `highlights:write`                   | Create, change and delete highlights                                                   | "Add, change and remove your highlights"          | High       |
| `notes:read`                         | Read the user's notes and annotations                                                  | "Read your notes"                                 | High       |
| `notes:write`                        | Create, change and delete notes                                                        | "Add, change and remove your notes"               | High       |
| `saves:read` / `saves:write`         | Saves and bookmarks                                                                    | "See / change your saves and bookmarks"           | Med / High |
| `profile:read`                       | The user's display name and real user ID                                               | "See your name and account ID"                    | Med        |
| `friends:read`                       | The user's friends list                                                                | "See who your friends are"                        | High       |
| `chat:respond`                       | Act as a chat participant; receives the messages of chats it's added to                | "Read and reply to chats you add it to"           | High       |
| `chat:shared`                        | Also take part in shared chats (other people's messages)                               | "Read messages from other people in shared chats" | High       |
| `session:read`                       | See the state of a shared reading session the user is in                               | "See shared reading sessions you join"            | Med        |
| `device:microphone`, `device:camera` | Adds `allow="microphone"` / `allow="camera"` to its frames; the browser still asks too | "Use your microphone / camera"                    | High       |
| `clipboard:write`                    | Copy text to the clipboard                                                             | "Copy text to your clipboard"                     | Low        |
| `embed:casualos`                     | Embed `ao.bot` patterns in its views                                                   | "Show CasualOS maps and grids"                    | Low        |
| _(network hosts)_                    | `fetch` to the listed hosts                                                            | "Connect to api.verse-art.example"                | Med        |

Notes on a few choices:

- **Reading position is asked for, even though it's "Low."** What someone reads, and when, says a lot about them. It's grouped into the summary line, but the extension doesn't get it silently.
- **Highlights are `publicRead` in CasualOS today, but still need a permission.** Inside the app, the extension would learn which public highlights belong to _this_ user. That link is the private part.
- **`chat:respond` and `chat:shared` are separate** because shared chats contain messages from people who never installed the extension.
- **Write permissions imply read.** `highlights:write` includes `highlights:read`; the prompt shows only the write line.
- **Writes are marked.** Anything a sandboxed extension creates (a highlight, a note) is tagged with its extension ID, so the app can show "added by Verse Art" and the user can undo everything one extension did.

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
> From **verse-art.example** · not reviewed by Seed Bible
>
> It will be able to:
>
> - See which passage you're reading and which verses you select
> - See your highlights
> - Connect to **api.verse-art.example**
>
> [Cancel] [Install]

High-risk permissions get a warning icon and their own line. The source line comes from the manifest's URL host, so a user can see that "Official Bible Tools" is actually served from somewhere unexpected.

### 6.2 Where the approval is stored

Grants are saved per extension as `{ extensionId, version, granted: string[], grantedAt }`. They're stored and synced the same way installed extension IDs already are — `localStorage` plus the user's profile, merged with timestamps (`mergeInstalledExtensionIds`) — so approving on one device carries to the others, and revoking on one isn't undone by another.

### 6.3 Updates

When a new version's manifest asks for nothing new, it updates silently. When it asks for anything new (a new permission or a new network host), the new version doesn't load. The old version keeps running if its pinned bundle is still available; otherwise the extension is paused. The user sees a "Verse Art wants new permissions" notice listing only what's new. This is how Chrome handles extension updates.

### 6.4 Revoking

Settings → Extensions gets a "Permissions" section per sandboxed extension, with a toggle per permission (required ones can't be turned off without uninstalling). Revoking tears down the extension's frames, removes everything it registered, and restarts it with the smaller set.

### 6.5 Installs that don't come from the user clicking Install

Two existing features install extensions without that click, and both have to stop at the consent dialog for sandboxed extensions:

- **`?autoinstall-<id>=true` URL parameters.** For a sandboxed extension, a link like this must only _offer_ the install (open the dialog), never perform it. Otherwise anyone could send a link that silently installs their extension.
- **Customizations with `auto-installed` extensions** (`CustomizationsManager.activeExtensionIds`). A shared `?customization=` link can name extensions to install. For sandboxed ones, the customization shows the consent dialog the first time it's applied.

`autoinstall: true` in a manifest is ignored for sandboxed extensions.

---

## 7. Developer experience

- **`create-seed-bible-extension`** generates the sandboxed shape by default: `defineExtension` from `seed-bible/extensions`, a `permissions` array in `extension.json`, and a test that mocks the SDK's broker rather than `SeedBibleState`.
- **`seed-bible-extension-scripts dev`** runs out-of-tree extensions in the sandbox by default, so a developer runs into a missing permission on their own machine, not in a user's bug report. A `--trusted` flag keeps today's in-page behavior for someone preparing a contribution to `packages/`. The dev server shows the consent dialog once and remembers it for that project.
- **`check`** warns when code calls an SDK method whose permission isn't declared (it's a fixed list of method → permission, so this can be a simple type-level check: SDK namespaces for undeclared permissions are typed as `never`).
- **`build --standalone`** produces the sandbox bundle. The `window.__seedBibleExtensionRuntime` shims are no longer needed for sandboxed extensions and can be retired once nothing uses them.
- **Errors are clear.** A call without permission rejects with `PermissionDeniedError("highlights:read is not granted")`, not a silent `undefined`.

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

2. **User data permissions.** Highlights, notes, saves, reading history, profile, chat providers, brokered sensitive fetch, update re-consent, and the per-extension Permissions section in Settings.
3. **Tooling.** Scaffolding template, sandboxed `dev`, permission checks in `check`, docs. Port one in-repo extension (for example `seed-bible-refresh-example-extension` or `locations-extension`) to the sandbox SDK as a working reference and to prove the API is enough for a real extension.
4. **Stronger isolation (optional).** Move frames to a dedicated cross-site origin, one subdomain per extension: separate process, real per-extension storage, and an `Origin` header third-party APIs recognize (an opaque-origin frame sends `Origin: null`, which some APIs' CORS settings reject). Also: optional permissions at runtime, and extension-to-extension calls brokered by the host (today's `dependencies` share live objects, which can't cross a frame boundary; for sandboxed extensions they'd become declared, message-based exports).

---

## 10. Open questions

1. **Should reading position need a prompt?** This proposal says yes (it's private), at the cost of a prompt line for nearly every extension. The alternative is to grant it by default and only prompt for stored user data.
2. **Should sandboxed extensions be allowed to depend on first-party ones?** It would need each first-party extension to define an explicit, message-safe API. Until then, sandboxed extensions can only depend on other sandboxed ones (phase 4), or none.
3. **Domain for phase 4.** It must be a different registrable domain from the app (not a subdomain of it) to get process isolation and keep cookies separate.
4. **A reviewed catalog.** A list of third-party extensions the team has looked at could show "reviewed" instead of "not reviewed" in the install dialog. That's a policy question more than a technical one.
