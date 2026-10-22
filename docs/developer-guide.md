# Seed Bible Developer Guide

This guide is for developers who want to understand how Seed Bible works and how to extend it. It assumes you're comfortable with general web development (HTML, JavaScript/TypeScript, npm-style packages), but it doesn't assume you already know **Preact**, **JSX**, or **signals** — the specific tools this codebase is built with. Each of those gets a plain-language explanation the first time it matters.

This is the first document in the series: an overview of what Seed Bible is, what it does, and how its extension system works. Later guides will go deeper on individual topics (the Bible data API, theming, patterns, etc.).

---

## 1. What is Seed Bible?

Seed Bible is a free, collaborative Bible reading and study app. You can read it as a normal website (it's a PWA — a website that can also be "installed" like an app on your phone or desktop), and everything in it — reading multiple translations side by side, highlighting verses, sharing a live reading session with someone else, chatting, building playlists — happens in the browser, backed by a real server for the things that need to persist or sync (accounts, saved highlights, shared sessions, etc.).

Two facts about how it's built matter for anyone extending it:

- **It's a standalone web app**, not a plugin running inside some other product. The main app (everything under `packages/seed-bible/`) is server-rendered for the initial page load (for fast load times and good SEO) and then runs as a normal single-page app in the browser.
- **It uses [CasualOS](https://github.com/casual-simulation/casualos) as its backend**, but only as a backend. CasualOS is a distributed, real-time data platform — it provides user accounts, encrypted file/record storage, and real-time multiplayer syncing (via a CRDT library called Yjs, which is what makes "two people see the same live cursor/scroll position" possible). Seed Bible talks to CasualOS through its SDK, the same way an app might talk to Firebase or Supabase. There's a second, unrelated way CasualOS shows up in this codebase — see [§6, Extensions vs. Patterns](#6-extensions-vs-patterns) — but as an app, Seed Bible is _not_ itself a CasualOS bot script; it's ordinary React-like frontend code.

If you've used React before, you already know most of what you need:

- **Preact** is a much smaller library with (almost) the same API as React — components, props, hooks. Anywhere you'd write React, the same mental model applies.
- **JSX** — the HTML-like syntax you see mixed into `.tsx` files (`<div>{title}</div>`) — is the same JSX you know from React. It compiles down to plain function calls that build up a UI tree; it's not special CasualOS or Seed Bible syntax.
- **Signals** (`@preact/signals`) replace React's `useState`/`useReducer` as this codebase's way of holding reactive state. A signal is a box around a value: `const count = signal(0)` gives you `count.value` to read or write it. The important part is that anything that _reads_ `count.value` — a component's render, or a `computed()`, or an `effect()` — automatically re-runs whenever that value changes, with no dependency array to maintain. Think of it as a spreadsheet cell: everything that references it updates when it changes.

You'll see these three things constantly, so it's worth having that mental model going in.

---

## 2. Major features

Seed Bible's functionality lives in a set of **managers** (`packages/seed-bible/seed-bible/managers/`), each owning one area. This is a useful map of "what the app can do," and it's also the map of what an extension can hook into, since extensions get access to (almost) the same manager objects the app itself uses.

- **Bible reading.** Multiple translations, book/chapter navigation, and a "tab" model where each open chapter is a tab — like browser tabs, but for Bible chapters. Tabs can be arranged into multiple side-by-side panels (so you can read two translations, or two different passages, at once).
- **Highlights, bookmarks, and annotations.** Verse highlighting (with color choices), bookmarking a reading position, and free-form notes attached to a location — all persisted to the user's account so they follow the user across devices.
- **Shared reading sessions.** A live, multiplayer version of the reader: one user creates a session, shares a link or invite, and everyone in the session sees the same passage and selections update in real time. This is the CRDT/Yjs-backed multiplayer piece mentioned above.
- **Chat.** An in-app chat panel. Chat "providers" (registered by the app or by extensions) can act as an AI participant in a chat — see [§5](#5-what-extensions-can-plug-into) for a real example that wires in an external chatbot.
- **Discover.** A contextual side panel that shows extra content for whatever chapter you're currently reading — cross-references, study notes, or arbitrary custom content. What shows up there comes from "Discover providers," which (again) extensions can register.
- **Playlists and reading plans.** Playlists are ordered, shareable queues of Bible content (and other media) that can be played back sequentially. Reading plans are structured, calendar-driven reading schedules with progress tracking.
- **Search.** Full-text Bible search, backed by Typesense.
- **Themes.** Light/dark mode plus configurable color schemes, applied via CSS variables.
- **Internationalization.** The UI is translated into 24 languages (`i18n/` — see `CLAUDE.md` for the translation workflow), with layout that adapts to right-to-left languages.
- **Onboarding and tutorial.** A first-run welcome flow and a guided tour of the main UI for new users.
- **Extensions.** A plugin system that lets you add all of the above kinds of things — tools, panels, chat providers, discover content — without touching the core app's code. The rest of this guide covers this in depth.

Separately, `patterns/` contains embeddable CasualOS applets (currently just a map/geo importer) that render inside cross-origin iframes. These are a different mechanism from extensions — see [§6](#6-extensions-vs-patterns).

---

## 3. What is an extension?

An **extension** is a self-contained package of code that plugs new functionality into the running app: a new toolbar button, a new panel, a new source of Discover content, a new chat provider, and so on — without modifying `packages/seed-bible` itself.

Concretely, an extension is:

- A small package under `packages/<name>-extension/` (by convention; the folder name isn't load-bearing, only the contents are).
- It has an `extension.json` with metadata (an ID and per-language title/description).
- It has an `index.ts` that exports one function as its `default` export.
- Calling that default export triggers registration: internally, it calls `registerExtension({ id, init, dependencies? })`, which is how the extension announces itself to the app.

Before Seed Bible had this system, adding a feature meant editing the core app. Now, a third party (or a small internal team) can ship a self-contained package that the app discovers, loads, and initializes on its own — and the user can install or uninstall it at runtime, the same way you'd install a browser extension.

### Two ways an extension reaches the app

1. **Bundled** — the extension package lives in this repo under `packages/`, and gets automatically discovered at build time (any folder containing an `extension.json` is picked up — see `script/lib/vite-plugin-extensions.ts`). This is how every extension in this repo today works (`seed-bible-refresh-example-extension`, `locations-extension`, `audio-reader-extension`, `apologist-extension`, `bonfire-extension`, `transcript-ui-extension`, `twitchPub-extension`, `twitchSub-extension`), and it's the fully-supported way to ship one: no build step, just source, swept into the app's own bundle alongside everything else.
2. **Loaded from a URL at runtime** — a published `ExtensionSet`, which a user adds by pasting its link into Settings → Extensions → "Add extensions from a link" (or opening a `?extensionSet=<url>` link), then installs from the Available list. In code, that's `discoverExtensionSet(url)` and `loadExtension({ meta, url })`. This is how a third party ships an extension without a pull request, and because nobody has reviewed that code, it **runs sandboxed**: in its own iframe, with no access to the page, the user's account or their data, and only the permissions the user approves when installing it. It's written against a smaller API, `seed-bible/extensions`, instead of `registerExtension` — see [§7](#7-third-party-sandboxed-extensions).

If you don't work inside this monorepo at all — a genuinely third-party developer building your own extension in your own project — see [§8](#8-building-an-extension-outside-this-repo) for the supported way to do that: a scaffolding CLI, plus a toolkit that can type-check, test, build, and (the part that actually matters) run a real Seed Bible dev server with your in-development extension auto-installed.

Sections 4–5 below describe bundled extensions, which get the full app state. A URL-loaded extension follows the same install/uninstall flow, but sees only what [§7](#7-third-party-sandboxed-extensions) describes.

---

## 4. Anatomy of an extension package

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

You can add more keys per language beyond `title`/`description` — those are the strings your extension's own UI uses (via the `useI18n` hook), and per `CLAUDE.md`'s translation convention, **only `en` needs to be complete**; other languages are filled in separately by translators. Note: `translation.json` also supports `dependencies` (an array of other extension IDs this one needs) and `autoinstall: true` (installed by default for every user the first time they see it — see [§4.3](#43-installation-and-persistence)).

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
      // ... register tools, panes, providers, etc. — see §5
    },
  });
}
```

### 4.1 The `init` function: what it receives and what it returns

`init(context, dependencies)` is called once your extension is actually being activated:

- **`context`** is the entire app state object (`SeedBibleState`) — the same object every manager listed in [§2](#2-major-features) hangs off of. Your extension reads and calls into it directly: `context.tools.registerToolbarTool(...)`, `context.panes.openPane(...)`, `context.app.toast(...)`, etc. There's no separate, cut-down "extension API" — you get the same surface the core app itself uses, which is a deliberate choice: an extension can do everything the core app can do.
- **`dependencies`** is an object keyed by extension ID, containing whatever each of your declared `dependencies` returned from _its own_ `init`. This is how one extension can call functions exposed by another (see [§4.4](#44-dependencies-between-extensions)).

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

### 4.2 The extension lifecycle

Putting it together, here's the full life of an extension:

1. **Discovery.** For bundled extensions, this happens at build/dev-server time: every `packages/<folder>/extension.json` is scanned and becomes an entry in the app's known extension set. For URL-loaded extensions, discovery is just whatever piece of your app UI calls `loadExtensionFromUrl(id, url)`.
2. **Registration.** The extension's module is imported and its default export function is _called_. That call runs `registerExtension({ id, init, dependencies })`, which records the extension as "known" but does **not** run `init` yet — only when the app's context is ready and all declared dependencies are already initialized.
3. **Initialization.** Once the app context exists and dependencies (if any) have resolved, `init(context, dependencyExports)` runs. This is where your extension actually adds its tools/panes/providers. If `init` throws, the error is logged and the extension is treated as not-yet-initialized (it'll retry the next time something re-triggers initialization, e.g. a dependency resolving).
4. **Installed state persists.** Once installation succeeds, the extension's ID is saved to `localStorage` and (if the user is logged in) mirrored into their synced profile — so an installed extension is remembered across reloads and follows the user to other devices. (`autoinstall: true` extensions get installed for every user automatically the first time, but a user who then uninstalls one won't have it silently reinstalled later.)
5. **Uninstallation.** When the user uninstalls the extension, every cleanup function it `yield`ed gets called (removing its tools, closing its effects, etc.), and its ID is dropped from the persisted install list.
6. **Reinstallation.** Because the extension's ES module was already evaluated once (JavaScript only runs a module's top-level code the first time it's imported), reinstalling doesn't naturally re-run your code. This is why the contract requires the default export to be a **function**, not just top-level side effects — the loader explicitly calls that cached function reference again on every (re)install attempt, which re-triggers `registerExtension(...)` and a fresh `init()` run. In practice this means: **don't rely on top-level code in your module running more than once** — put your setup inside the function you export as default.

### 4.3 Installation and persistence

A couple of details worth knowing if you're building UI around extensions (or just want to understand why installs behave the way they do):

- Installed-extension IDs are tracked in two places — `localStorage` (works while logged out) and the logged-in user's synced profile (works across devices) — and merged together using install/uninstall timestamps, specifically so that uninstalling an extension on one device doesn't get silently undone by a stale copy of "still installed" from another device.
- `autoinstall: true` in `extension.json` means the extension is installed automatically the first time a user's session sees it (e.g. you shipped a new default extension in a release). It is deliberately a one-time nudge: if a user uninstalls it, that decision sticks, even on their next visit.
- Extensions can also be force-installed via a URL query parameter for testing (`?autoinstall-<extension-id>=true`), independent of the `autoinstall` metadata flag.

### 4.4 Dependencies between extensions

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

---

## 5. What extensions can plug into

Because `init` gets the same `context` the core app uses, "what can an extension do" is really "what's on `context`." Below are the extension points you're most likely to use, each with a real example already in this codebase.

### Toolbar tools — buttons in the reader's main toolbar

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

### Verse toolbar tools — actions on selected verses

`context.tools.registerVerseToolbarTool({...})` adds an action that appears when the user has selected one or more verses. `isVisible` can be a function returning `true`/`false` (or a signal), so the tool can hide itself unless it's relevant.

The **locations extension** (`packages/locations-extension/`) uses this well: it scans the currently-selected verses' text for place names it recognizes, and only shows a "Locations" tool (with a submenu listing each found place) when at least one match was found. Selecting a place fetches GeoJSON boundary data and opens it on a map (rendered via a CasualOS _pattern_ — see [§6](#6-extensions-vs-patterns)) inside a floating pane.

### Quick tools — compact icons above the reader

`context.tools.registerQuickTool({...})` is for small, always-visible-when-relevant icons in the reader's top row (next to the bookmark button). The **audio-reader extension** (`packages/audio-reader-extension/`) uses this for a play/pause button that only appears when the current chapter has narration audio available, and its `icon` swaps between a play and pause glyph based on a signal tracking playback state.

### Below-reader tools

`context.tools.registerBelowReaderTool({...})` adds something to a toolbar shown underneath the reading pane itself (rather than above it).

### Custom panes — your own UI, anywhere in the app's pane system

`context.panes.openPane({...})` opens an arbitrary Preact component in one of three placements: `"side"` (a docked side panel), `"floating"` (a draggable/resizable window), or `"fullscreen"` (covers the reader). This is how a toolbar tool's `onSelect` typically shows its actual content. Panes can also embed a CasualOS grid or map portal via the `<PortalComponent>` helper (as the locations extension and the example extension both do), which is how an extension can render a whole separate CasualOS "pattern" application inside the main app.

### Discover providers — contribute content to the Discover panel

`context.discover.registerDiscoverProvider({ id, title, description, discover })` lets an extension contribute to the "Discover" side panel, which shows extra material for whatever chapter is currently open. `discover(context)` receives the current translation/book/chapter/language and returns a list of results — cross-references, study notes, or arbitrary rendered content. The example extension registers a toy provider that returns a canned cross-reference between Genesis 1 and John 1.

### Chat providers — plug in a conversational participant

`context.chats.registerProvider({ id, name, generateResponse, supportsSharedChats })` adds a chat participant that can generate responses to messages — effectively, "install an AI assistant into the chat panel." The **apologist extension** (`packages/apologist-extension/`) is a complete real example: it reads configuration from the URL's query parameters (an API domain, key, model, an optional shared-conversation token), and its `generateResponse` forwards the conversation (plus what chapter the user is currently reading, for context) to an external chat-completion API and returns the reply as a chat message.

### Reacting to app state — effects

Since app state lives in signals, an extension reacts to it the same way any component does: with `effect(() => { ... })`, which re-runs whenever any signal it reads changes. The example extension logs the current reading position whenever it changes:

```tsx
yield effect(() => {
  if (context.app.currentReadingState.value) {
    console.log("now reading:", context.app.currentReadingState.value.bookId);
  }
});
```

The audio-reader extension uses the same mechanism to stop playback the instant the user navigates to a different chapter, so a previous chapter's narration never keeps playing under the next one.

### User feedback and other odds and ends

- `context.app.toast(message)` shows the same bottom-of-screen toast the core app uses.
- `context.sidebar.openChatPanel()` / `context.chats.selectChat(id)` — open the chat sidebar to a specific conversation (used by the apologist extension to jump straight to a restored conversation).
- `context.login`, `context.navigation`, `context.i18n`, and the rest of the managers from [§2](#2-major-features) are all available the same way.

---

## 6. Extensions vs. patterns

These are two different mechanisms and it's easy to conflate them because both live in this repo and both are "pluggable":

- An **extension** (`packages/*-extension/`, this guide) runs _inside_ the main Seed Bible app, in the same page, with full access to `SeedBibleState`. It's written the same way the app itself is (Preact/JSX/signals).
- A **pattern** (`patterns/`) is a separate CasualOS application — bot scripts packaged into a `.aux` file — that gets embedded as a _cross-origin_ `ao.bot` iframe via `<PortalComponent>`. It runs in its own sandboxed context with its own CasualOS runtime (`os`, `thisBot`, `configBot` globals), and it communicates with the host page only through the iframe boundary (query params in, and whatever CasualOS's cross-frame APIs allow).

The reason both show up together in the same example: a pane opened by an extension can embed a pattern. The locations extension does exactly this — it's an _extension_ (runs in the main app, reacts to verse selection) that opens a pane whose content is the `geo-importer` _pattern_ (a separate CasualOS map applet) to actually render the map. If you need custom code running inside a grid/map portal, you need a pattern; if you need to add a feature to the main app's UI or behavior, you need an extension. Patterns are out of scope for this guide — see `DEVELOPERS.md` for the basics of building one.

### A note on overloaded terminology

You'll also encounter `context.readingExtensions` (backed by `BibleReadingExtensionManager`) in the app state. Despite the name, **this is not the plugin system described in this guide.** It's a narrower, session-level mechanism for customizing reading _navigation_ and _Discover content_ on a per-reading-state basis (e.g. hooking "what happens when the user hits next chapter," or transforming what Discover shows, with data that syncs within a shared session). If you're building a plugin that a user installs from the Settings page, you want `registerExtension` and the app-wide `context.tools`/`context.panes`/`context.discover` APIs covered above — not `readingExtensions`.

---

## 7. Third-party (sandboxed) extensions

Every extension loaded from a URL runs sandboxed. The design, including what it protects against and what it doesn't, is in [`extension-security.md`](./extension-security.md). This section covers what you need to write one.

**Where it runs.** Your code runs in a hidden iframe with its own, unique origin. It can't read the app's DOM, storage or cookies, so the user's session key and data are out of reach. It talks to Seed Bible only through the `sb` object the SDK gives you, and each call is checked against what the user granted. When you open a pane, the host draws the pane (its border, title and close button, plus a badge with your extension's name) and renders your view in a second iframe inside it.

**What it looks like.** The module's default export is the result of `defineExtension`:

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

**What `sb` offers.**

- `sb.tools.registerToolbarTool` / `registerVerseToolbarTool` / `registerQuickTool` / `registerBelowReaderTool`. Same idea as §5, but declarative: `icon` is `{ material: "<Material Symbols name>" }` or `{ svg: "<svg…>" }`; `isVisible`/`isDisabled` are booleans or signals; a submenu is a list of `items`, each with its own `onSelect`. Each returns a handle with `update()` and `unregister()`. Priorities are kept between 200 and 999, after the app's own tools. Only `main` can register tools, not views.
- `sb.panes.open({ view, placement, title, props })` and `sb.panes.close(id)`. `props` must be JSON.
- `sb.app.toast(message)` (shown with your extension's name) and `sb.app.isMobile`.
- `sb.storage.get/set/remove/keys`: your own JSON key/value store, up to 256 KB. The frame has no `localStorage`. While the user is signed in it syncs to a private record in their account, so it follows them to their other devices (the newer write to a key wins). Signed out, it stays on the device. It's cleared everywhere when the user uninstalls your extension.
- `sb.settings.get(key)`: your own non-sensitive settings from `extension.json`.
- `sb.i18n.t(key, defaultValue, values)`, `sb.i18n.language` and `sb.i18n.direction`: strings come from your `extension.json` translations. The frame's theme colors, language and text direction are set for you, so `var(--sb-font-color)` and friends work in your CSS.
- `sb.reading.position`, `sb.reading.selection` and `sb.reading.open(ref)`, if granted (below).

A call that isn't allowed rejects with a `SandboxError` whose `code` says why: `permission_denied`, `invalid_request`, `not_found` or `limit_exceeded`.

**Permissions and network hosts.** Declare them in `extension.json`; the user sees them, in plain language, before anything of yours runs:

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

**"Can be required: No"** means the permission can only go under `optionalPermissions`, and you ask for it with `sb.permissions.request` when the feature that needs it is used. A manifest that lists one under `permissions` won't install, and `seed-bible-extension-scripts check` (which `build` and `publish` run) stops with a message saying which to move. The rule: anything that changes the user's data, identifies them, reads their private notes, involves other people, or uses the microphone or camera is always optional. Users can also turn optional permissions on and off themselves, on the extension's Permissions tab (open it from Settings → Extensions); that restarts your extension with the new set, so read `sb.permissions.has()` rather than assuming.

**Needs no permission:** `sb.identity` (an id for the user that's the same every time for your extension, different for every extension, not their real id, and null when signed out), `sb.bible.chapter({ translationId, bookId, chapter })` for public Bible text, `sb.sensitive.fetch(...)` for requests that carry the user's sensitive settings (see the `sensitive` section of `extension.json`), `sb.modals.alert`/`open` (only right after the user interacts with your extension), and `sb.settings.registerPanel(view)` for a view on your extension's Settings tab.

**People, without their real ids.** A friend's or session participant's `id` is pseudonymous the same way `sb.identity` is: stable for your extension, different for every extension, never the real account id. It's also the same as that person's own `sb.identity` in your extension, so you can match people up on your own server. Guests in a session (not signed in) get an id for their connection instead, which changes when they reconnect. `sb.session.current` is null when there's no shared session in the current tab.

**Only right after the user interacts with your extension:** starting or resuming audio (`sb.audio.play`, `playNarration`, `readAloud`, `resume`), `sb.clipboard.writeText`, `sb.devices.recordAudio` and `sb.devices.takePhoto`, like `sb.modals` and `sb.permissions.request`. Otherwise they reject with `invalid_request`. Call them from a tool's `onSelect` or a click in one of your panes.

**The app's audio player.** `sb.audio` plays through the same player as the app's own narration: it shows in the reader's playback controls for the tab in view, where the user can pause, scrub and stop it, it keeps playing when your pane closes, and starting it pauses whatever else the app was playing. Your extension plays one thing at a time; starting another replaces it.

- `play(url)`: an audio file, `https:` on one of your `network` hosts (it plays in the app's page, so only from hosts the user approved).
- `narrators({ translationId, bookId, chapter })` and `playNarration({ ..., reader? })`: the app's recorded narration of a chapter, by a named reader or the first there is. It rejects with `not_found` when there's none, so fall back to `readAloud`.
- `readAloud({ translationId, bookId, chapter, fromVerse?, toVerse? })`: the app's text-to-speech. Its position counts verses, not seconds.
- `pause()`, `resume()`, `seek(position)` and `stop()` only ever reach what your extension is playing. `sb.audio.playback` is a signal with what that is (`kind`, `isPlaying`, `position`, `duration`, `unit`), or null.

Each `play…` resolves when playback ends, with `finished: false` if it was stopped rather than played to the end: by you, by the user, by something else taking over that tab's player, or by the tab closing. Unlike the app's own narration, yours doesn't highlight verses as they're read or count toward reading history. A frame can still play audio by itself with an `<audio>` element from a `network` host, without any permission, but it stops when the frame closes and has no controls in the app.

**The microphone and camera.** Your frames can't use `getUserMedia` (browsers only allow it in pages with a real origin, and your frame's origin is opaque). Instead, `recordAudio({ maxSeconds })` and `takePhoto()` ask the app to show its own dialog, titled with your extension's name. The device is only on while that dialog is open, nothing is recorded until the user presses Record (or Take photo), and you get back just the result, as a `Blob`, or `null` if they cancelled. There's no live stream, so real-time uses (speech recognition as they talk, video calls) aren't possible. Recordings are at most `maxSeconds` long (60 by default, up to 300). The browser also asks the user for the device the first time, on Seed Bible's behalf.

**CasualOS portals.** `sb.portals.open({ pattern, portalType, portal?, inst?, query?, placement, title })` opens an `ao.bot` grid or map portal in a pane the app draws, the way `PortalComponent` does for built-in extensions. It isn't inside your frame (a frame nested in the sandbox couldn't run `ao.bot`). `pattern` is `{ name }` or `{ aux: "https://…" }`. Without `inst`, each open gets a fresh instance. `query` can't set `inst`, `staticInst`, `gridPortal`, `mapPortal`, `pattern` or `patternAux`. The handle's `send(message)` posts to the portal, and `onMessage(listener)` receives what its `os.sendEmbedMessage` sends. The pattern runs on `ao.bot`, outside Seed Bible's sandbox, with whatever `ao.bot` itself can do in the user's browser.

**Writing user data needs an account.** `notes.create`, `saves.add` and similar reject with `unavailable` when the user is signed out, rather than prompting them to sign in.

**Optional permissions.** Anything your extension can work without goes under `optionalPermissions` instead. The install dialog only asks for `permissions`; it mentions the optional ones as things you may ask for later. Ask for one when the feature that needs it is used:

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

`sb.permissions.request(permission | permission[])` resolves `true` once everything asked for is granted. It resolves straight away, without a prompt, when that's already the case. The user is only asked right after they interact with your extension: in a tool's `onSelect`, or a click inside one of your panes. A request at any other time rejects with an `invalid_request` `SandboxError`. If the user says no, later requests for that permission resolve `false` without asking again until the page reloads, so design the feature to carry on without it. `sb.permissions.granted` (a signal), `sb.permissions.has()` and `sb.permissions.optional` tell you where things stand. What the user grants is remembered, including through updates that still list it. Network hosts can't be optional.

`network` lists every host your frames may contact (`fetch`, images, media, fonts); anything else is blocked. Requests arrive with `Origin: null`, so the server must allow that in its CORS headers (`Access-Control-Allow-Origin: *` does). A manifest that names a permission this version of Seed Bible doesn't know won't install, rather than install without it.

**Icon.** `icon` is a square image in your project (`.png`, `.svg`, `.webp` or `.jpg`, under 256 KB; 256 pixels across is plenty). Seed Bible shows it wherever your extension is listed, on its page and in the install dialog, in place of the colored initials it shows otherwise. `publish` uploads it to its own link and puts that link in the manifest; `package` copies it next to the bundle and `dev` serves it. You can also give a full `https:` link to an image hosted elsewhere. `check` refuses an icon Seed Bible couldn't show.

**Updates.** A new version that asks for nothing new loads without asking. One that asks for more shows the user only what's new, and doesn't load until they agree. Uninstalling forgets the grant, so reinstalling asks again.

**How users install it.** `publish` prints a link to your extension's `ExtensionSet` (or, if you host it yourself with `package`, it's the `extension-set.json` next to the install page). A user pastes it into Settings → Extensions → "Add extensions from a link", which lists your extension under Available; installing it then shows the consent dialog. A link to Seed Bible with `?extensionSet=<that link>&autoinstall-<id>=true` opens that dialog directly. Either way Seed Bible remembers where the extension came from (on the device and in the user's profile), so it loads again on the next visit and on their other devices. Only `https:` links can be added, plus `http://localhost` while you develop.

**Testing it.** `createTestHost` from `seed-bible/extensions/testing` runs your extension in a unit test, against a stand-in for Seed Bible, through the same SDK and wire protocol as the app. Every call is checked against the permissions the test grants, so a test catches a missing permission the way the app would:

```tsx
import extension from "../src/main";
import { createTestHost } from "seed-bible/extensions/testing";

it("toasts from its verse tool", async () => {
  const host = await createTestHost(extension, {
    granted: ["reading:selection"],
  });
  await host.ready; // main has finished
  await host.selectTool("share-art", {
    selection: [
      /* … */
    ],
  });
  expect(host.toasts).toEqual(["Copied!"]);
});
```

`host.tools`, `host.panes`, `host.toasts`, `host.storage`, `host.opened`, `host.clipboard` and `host.calls` record what the extension did. `host.renderView(name)` renders a view into the test's document, `host.setState({ position })` moves the reader, and `host.discover(...)`/`host.chat(...)` ask its providers. `allowRequests: false` makes the "user" decline optional permissions. For anything the stand-in doesn't simulate (Bible text, highlights, sensitive requests…), pass an answer in `answers: { "bible.chapter": () => ({ verses: [...] }) }`; without one, the call fails with a message saying so.

**A full example.** `packages/sandboxed-example-extension` is the example extension (§9) ported to the sandbox: tools, a pane that reads its settings, a Discover provider, a sensitive request, and CasualOS portals behind an optional permission, with tests in `test/unit/sandboxed-example-extension/`. Comments mark where it has to differ from the original.

**Limits for now.** A sandboxed extension can't declare `dependencies`, and its `autoinstall` is ignored: it never installs without the user being asked. A chat provider replies with one text message (no streaming), and a Discover provider answers with data (`content`, `cross-reference` or `study-note` results), not custom markup. An extension whose main frame stops answering is stopped until the page reloads. Styles must come from the bundle itself, as inline styles or CSS imported with `?inline`, since the frame can't load a separate stylesheet.

---

## 8. Building an extension outside this repo

Everything in §§3–6 assumes your extension's source lives inside this monorepo, under `packages/`. If you're a genuinely third-party developer — your own project, your own repo, no local clone of `seed-bible` — two companion packages give you the same experience anyway:

- **`create-seed-bible-extension`** scaffolds a new, self-contained extension project anywhere on disk: `npx create-seed-bible-extension@latest my-extension` (or the `npm create`/`pnpm create` equivalents). The project is a sandboxed extension ([§7](#7-third-party-sandboxed-extensions)): `src/init.tsx` uses `defineExtension` from `seed-bible/extensions`, adds a toolbar button that opens a pane, asks for an optional permission when it's clicked, and keeps a count in `sb.storage`. `src/init.test.tsx` tests it with `createTestHost`. `extension.json` has `version`, `permissions`, `optionalPermissions` and `network`. Its `package.json` has a real `"seed-bible"` dependency, pinned to a published version, and the SDK's types come from that package, so they can't drift from what it ships.
- **`seed-bible-extension-scripts`** is the toolkit that project's `package.json` scripts call: `check`, `lint`, `test`, `build`, `package`, `publish` and `dev`.

Each package's README is the full reference: [`create-seed-bible-extension`](../packages/create-seed-bible-extension/README.md) for what a new project contains, and [`seed-bible-extension-scripts`](../packages/seed-bible-extension-scripts/README.md) for every command, step-by-step hosting on GitHub Pages and Cloudflare, and troubleshooting.

Whether a project is sandboxed is decided by its code: one that imports `seed-bible/extensions` is. The commands below describe that case; a project written with `registerExtension` (a contribution meant for `packages/`) still works the way it did, as noted.

**`check`** type-checks the project, then checks `extension.json` the way Seed Bible will when installing it: every permission is one it knows, and none that can only be optional is listed as required. It also reads your code for the `sb.*` calls that need a permission (`sb.highlights.add`, `sb.reading.position`, …). One whose permission `extension.json` doesn't declare is an error, since Seed Bible would refuse it every time. A declared permission nothing seems to use is a warning, since it only makes the install prompt longer. It reads the code as text, so it can't see a call made some roundabout way.

**`dev`** runs your extension in a real Seed Bible, the way users will get it. It builds the bundle and rebuilds it whenever you save, serves it from `http://localhost:5174` with an `ExtensionSet` whose `integrity` hash and manifest always match the latest build, starts Seed Bible's dev server, and opens it with a link that offers to install your extension. Approve it once; after that, reload the page to run your latest code. Seed Bible remembers the extension, and a manifest change that asks for more shows the update prompt, as a real update would. Which Seed Bible it runs follows your project's `seed-bible` dependency, the way an Android app's `targetSdkVersion` picks the platform it's built against:

- A version range (`"seed-bible": "^1.13.0"`) runs the newest release tag that satisfies it. Each release gets its own cached checkout, so to move to a newer Seed Bible, raise the version (or run `pnpm update seed-bible`) and the next `dev` uses it.
- A local path (`"seed-bible": "link:../seed-bible/packages/seed-bible"`) runs the checkout that path points into, so your own `seed-bible` changes show up immediately.
- `--seed-bible-version <range|branch>` overrides it for one run, e.g. `--seed-bible-version develop` for unreleased changes. `--repo <path>` uses any existing checkout. `--port` and `--extension-port` change the two ports.

`dev` stops with an error if the chosen version is too old to install an extension from a link, instead of starting without it. Running the app is necessary because the `seed-bible` npm package is the library of managers, components and the SDK, not the bootable reader. (For a `registerExtension` project, `dev` instead puts it into the app's own build through `SEED_BIBLE_EXTRA_EXTENSION_DIRS`, with hot reloading, trusted, as if it lived in `packages/`.)

**`build`** runs `check` and the tests, then writes `dist/standalone/index.js`: one ES module with Preact and everything else it imports bundled in (one copy of each, even if `seed-bible` uses a different Preact version). That's the file Seed Bible loads. (A `registerExtension` project gets `dist/monorepo-package/` instead: its validated source, ready to drop into a `seed-bible` checkout's `packages/<name>/`. Asking such a project for `--standalone` is an error, since only a sandboxed extension can be loaded from a URL.)

**`package`** writes `dist/site/`, a folder of static files that installs your extension from any static host, at any address: the bundle (named by its hash, so it can be cached for good), `extension-set.json` (which links the bundle relative to itself), an `index.html` with an "Install in Seed Bible" button, and the host config Seed Bible needs to fetch the files (`_headers` for Cloudflare and Netlify, `.nojekyll` for GitHub Pages). A scaffolded project can deploy it three ways: to GitHub Pages with the included `.github/workflows/deploy-pages.yml` (on every push to `main`, once Pages' source is set to GitHub Actions), or with `npm run deploy:cloudflare-pages` or `npm run deploy:cloudflare-workers`. Share the hosted page, or its `extension-set.json` link; users who installed the extension get each new upload the next time they open Seed Bible. `--app-url` points the install button at another Seed Bible.

**`publish`** is the way to ship without a pull request or your own hosting. It runs `build`, uploads the bundle as a public file record, wraps `extension.json` and the bundle's `integrity` hash into a one-extension `ExtensionSet` manifest, and prints the manifest's link along with a ready-made install link. The manifest goes in a public data record (address `extension-sets/<id>` in your account's record) rather than a file, because a file's URL changes with its contents: the record is overwritten by each `publish`, so its link stays the same and everyone who installed from it gets the new version on their next visit. Seed Bible reads it from the records server's `GET /api/v2/records/data` URL, unwrapping the record from the server's response. Users add it as described in §7. The first `publish` prompts you to log in once (an email address, then the code it emails you) and mints a long-lived key it prints and asks you to save as `SEED_BIBLE_RECORD_KEY`; every later `publish` (including in CI) reads that instead. Pass `--dry-run` to see the manifest without uploading anything.

---

## 9. Where to go from here

- Copy `packages/seed-bible-refresh-example-extension/` as a starting point — it demonstrates every extension point covered in §5 in one file. (If you're not working inside this repo at all, use `create-seed-bible-extension` instead — see §8 — and look at `packages/sandboxed-example-extension/`, the same extension written for the sandbox.)
- Run `pnpm dev` and use the in-app Settings extensions list to install/uninstall your extension while iterating; bundled extensions are auto-discovered, so adding a new `packages/<name>/extension.json` is picked up by the dev server automatically.
- Look at `packages/locations-extension`, `packages/audio-reader-extension`, and `packages/apologist-extension` for complete, real-world extensions covering three very different use cases: content analysis + map integration, media playback tied to reading state, and third-party chat integration.
