# Seed Bible Developer Guide

This guide is for developers who want to understand how Seed Bible works and how to extend it. It assumes you're comfortable with general web development (HTML, JavaScript/TypeScript, npm-style packages), but it doesn't assume you already know **Preact**, **JSX**, or **signals** — the specific tools this codebase is built with. Each of those gets a plain-language explanation the first time it matters.

This is the first document in the series: an overview of what Seed Bible is, what it does, and how its extension system works. Later guides will go deeper on individual topics (the Bible data API, theming, patterns, etc.).

---

## 1. What is Seed Bible?

Seed Bible is a free, collaborative Bible reading and study app. You can read it as a normal website (it's a PWA — a website that can also be "installed" like an app on your phone or desktop), and everything in it — reading multiple translations side by side, highlighting verses, sharing a live reading session with someone else, chatting, building playlists — happens in the browser, backed by a real server for the things that need to persist or sync (accounts, saved highlights, shared sessions, etc.).

Two facts about how it's built matter for anyone extending it:

- **It's a standalone web app**, not a plugin running inside some other product. The main app (everything under `packages/seed-bible/`) is server-rendered for the initial page load (for fast load times and good SEO) and then runs as a normal single-page app in the browser.
- **It uses [CasualOS](https://github.com/casual-simulation/casualos) as its backend**, but only as a backend. CasualOS is a distributed, real-time data platform — it provides user accounts, encrypted file/record storage, and real-time multiplayer syncing (via a CRDT library called Yjs, which is what makes "two people see the same live cursor/scroll position" possible). Seed Bible talks to CasualOS through its SDK, the same way an app might talk to Firebase or Supabase. There's a second, unrelated way CasualOS shows up in this codebase — see [§6, Extensions vs. Patterns](#6-extensions-vs-patterns) — but as an app, Seed Bible is *not* itself a CasualOS bot script; it's ordinary React-like frontend code.

If you've used React before, you already know most of what you need:

- **Preact** is a much smaller library with (almost) the same API as React — components, props, hooks. Anywhere you'd write React, the same mental model applies.
- **JSX** — the HTML-like syntax you see mixed into `.tsx` files (`<div>{title}</div>`) — is the same JSX you know from React. It compiles down to plain function calls that build up a UI tree; it's not special CasualOS or Seed Bible syntax.
- **Signals** (`@preact/signals`) replace React's `useState`/`useReducer` as this codebase's way of holding reactive state. A signal is a box around a value: `const count = signal(0)` gives you `count.value` to read or write it. The important part is that anything that *reads* `count.value` — a component's render, or a `computed()`, or an `effect()` — automatically re-runs whenever that value changes, with no dependency array to maintain. Think of it as a spreadsheet cell: everything that references it updates when it changes.

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

1. **Bundled** — the extension package lives in this repo under `packages/`, and gets automatically discovered at build time (any folder containing an `extension.json` is picked up — see `script/lib/vite-plugin-extensions.ts`). This is how every extension in this repo today works (`seed-bible-refresh-example-extension`, `locations-extension`, `audio-reader-extension`, `apologist-extension`, `bonfire-extension`, `transcript-extension`, `twitchPub-extension`, `twitchSub-extension`).
2. **Loaded from a URL at runtime** — an extension package doesn't have to live in this repo at all. `ExtensionManager.loadExtensionFromUrl(id, url)` can dynamically `import()` a module from any URL and install it the same way, provided that module's default export follows the same contract. This is the mechanism a genuinely third-party, out-of-tree extension would use.

Either way, the extension itself is written the same way and follows the same lifecycle below.

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

**`extension.json`** — the metadata that the app needs *before* the extension is even installed, so it can list the extension in the Settings UI:

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
- **`dependencies`** is an object keyed by extension ID, containing whatever each of your declared `dependencies` returned from *its own* `init`. This is how one extension can call functions exposed by another (see [§4.4](#44-dependencies-between-extensions)).

`init` can be written two ways, and you'll see both in this codebase:

1. **A plain function that returns an object.** The returned object is this extension's public export — what other extensions see in their `dependencies` if they depend on this one.
2. **A generator function** (`function* (context) { ... }`) — this is the more common pattern, and it's worth explaining if you haven't used JS generators before. Inside a generator, `yield someValue` doesn't return from the function; it pauses and hands `someValue` back to the caller, and hands control back to you the *next* time the caller asks for the next value. `ExtensionInitalizer` (the thing that runs your `init`) takes advantage of this: every value you `yield` is treated as a **cleanup function** — most tool-registration calls (`registerToolbarTool`, `registerVerseToolbarTool`, an `effect()`, etc.) themselves return a "stop doing this" function, so you `yield` that return value. When the extension is later uninstalled, every yielded cleanup function gets called, undoing exactly what that registration did. When the generator finally `return`s (like an ordinary function would), that return value becomes the extension's public export, exactly as in case 1.

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
2. **Registration.** The extension's module is imported and its default export function is *called*. That call runs `registerExtension({ id, init, dependencies })`, which records the extension as "known" but does **not** run `init` yet — only when the app's context is ready and all declared dependencies are already initialized.
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

---

## 5. What extensions can plug into

Because `init` gets the same `context` the core app uses, "what can an extension do" is really "what's on `context`." Below are the extension points you're most likely to use, each with a real example already in this codebase.

### Toolbar tools — buttons in the reader's main toolbar

`context.tools.registerToolbarTool({...})` adds a button to the reader's toolbar. It needs an `id`, a `title` (a string, or a translation key + default value), an `icon` (a small component), a `priority` (lower numbers sort earlier — extensions should generally use 200–999, after the built-in tools), and either an `onSelect` handler or a `getItems` function that returns a submenu.

The example extension uses this to open a custom pane:

```tsx
yield context.tools.registerToolbarTool({
  id: "my-example-tool",
  title: { key: "my-example-tool", defaultValue: "My Example Tool", ns: "example-extension" },
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

The **locations extension** (`packages/locations-extension/`) uses this well: it scans the currently-selected verses' text for place names it recognizes, and only shows a "Locations" tool (with a submenu listing each found place) when at least one match was found. Selecting a place fetches GeoJSON boundary data and opens it on a map (rendered via a CasualOS *pattern* — see [§6](#6-extensions-vs-patterns)) inside a floating pane.

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

- An **extension** (`packages/*-extension/`, this guide) runs *inside* the main Seed Bible app, in the same page, with full access to `SeedBibleState`. It's written the same way the app itself is (Preact/JSX/signals).
- A **pattern** (`patterns/`) is a separate CasualOS application — bot scripts packaged into a `.aux` file — that gets embedded as a *cross-origin* `ao.bot` iframe via `<PortalComponent>`. It runs in its own sandboxed context with its own CasualOS runtime (`os`, `thisBot`, `configBot` globals), and it communicates with the host page only through the iframe boundary (query params in, and whatever CasualOS's cross-frame APIs allow).

The reason both show up together in the same example: a pane opened by an extension can embed a pattern. The locations extension does exactly this — it's an *extension* (runs in the main app, reacts to verse selection) that opens a pane whose content is the `geo-importer` *pattern* (a separate CasualOS map applet) to actually render the map. If you need custom code running inside a grid/map portal, you need a pattern; if you need to add a feature to the main app's UI or behavior, you need an extension. Patterns are out of scope for this guide — see `DEVELOPERS.md` for the basics of building one.

### A note on overloaded terminology

You'll also encounter `context.readingExtensions` (backed by `BibleReadingExtensionManager`) in the app state. Despite the name, **this is not the plugin system described in this guide.** It's a narrower, session-level mechanism for customizing reading *navigation* and *Discover content* on a per-reading-state basis (e.g. hooking "what happens when the user hits next chapter," or transforming what Discover shows, with data that syncs within a shared session). If you're building a plugin that a user installs from the Settings page, you want `registerExtension` and the app-wide `context.tools`/`context.panes`/`context.discover` APIs covered above — not `readingExtensions`.

---

## 7. Where to go from here

- Copy `packages/seed-bible-refresh-example-extension/` as a starting point — it demonstrates every extension point covered in §5 in one file.
- Run `pnpm dev` and use the in-app Settings extensions list to install/uninstall your extension while iterating; bundled extensions are auto-discovered, so adding a new `packages/<name>/extension.json` is picked up by the dev server automatically.
- Look at `packages/locations-extension`, `packages/audio-reader-extension`, and `packages/apologist-extension` for complete, real-world extensions covering three very different use cases: content analysis + map integration, media playback tied to reading state, and third-party chat integration.
