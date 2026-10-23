# Seed Bible Extension API Reference

This is the reference for everything a third-party (sandboxed) extension can call. It lists every part of the `sb` object, what each call takes and returns, which permission it needs, and how it can fail. It also covers `extension.json` and the test helper.

If you haven't built an extension before, start with the [quick start](./developer-guide.md#1-quick-start) in the developer guide, then §4 of the guide, which walks through the same API by example. For _why_ things work the way they do (why your code runs in an iframe, why some permissions can't be required), see [`extension-security.md`](./extension-security.md).

This document covers extensions written with `defineExtension` from `seed-bible/extensions`. That's every extension installed from a link. Extensions that live inside this repo under `packages/` and use `registerExtension` are trusted and get the app's full internal state instead; that's covered in §8 of the developer guide, not here.

---

## Contents

1. [Conventions that apply everywhere](#1-conventions-that-apply-everywhere)
2. [`defineExtension` and views](#2-defineextension-and-views)
3. [The `sb` object](#3-the-sb-object)
   - [`sb.extensionId`](#sbextensionid) · [`sb.permissions`](#sbpermissions) · [`sb.i18n`](#sbi18n) · [`sb.app`](#sbapp) · [`sb.identity`](#sbidentity)
   - [`sb.tools`](#sbtools) · [`sb.panes`](#sbpanes) · [`sb.modals`](#sbmodals)
   - [`sb.storage`](#sbstorage) · [`sb.settings`](#sbsettings) · [`sb.sensitive`](#sbsensitive)
   - [`sb.reading`](#sbreading) · [`sb.bible`](#sbbible) · [`sb.history`](#sbhistory)
   - [`sb.highlights`](#sbhighlights) · [`sb.notes`](#sbnotes) · [`sb.saves`](#sbsaves)
   - [`sb.profile`](#sbprofile) · [`sb.friends`](#sbfriends) · [`sb.session`](#sbsession)
   - [`sb.discover`](#sbdiscover) · [`sb.chats`](#sbchats)
   - [`sb.audio`](#sbaudio) · [`sb.clipboard`](#sbclipboard) · [`sb.devices`](#sbdevices) · [`sb.portals`](#sbportals)
4. [Shared types](#4-shared-types)
5. [Errors](#5-errors)
6. [Limits](#6-limits)
7. [Permissions at a glance](#7-permissions-at-a-glance)
8. [`extension.json`](#8-extensionjson)
9. [Testing with `createTestHost`](#9-testing-with-createtesthost)

---

## 1. Conventions that apply everywhere

**Imports.** Everything comes from two entry points of the `seed-bible` npm package:

```ts
import { defineExtension, SandboxError } from "seed-bible/extensions";
import { createTestHost } from "seed-bible/extensions/testing"; // tests only
```

`seed-bible/extensions` also exports the types used below (`SandboxContext`, `SandboxPermission`, `SandboxNote`, …) and two constants: `SANDBOX_PERMISSIONS` (the list of every permission name) and `SANDBOX_PERMISSION_INFO` (each permission's risk level and whether it can be required).

**Every call is a message.** Your code runs in an iframe that can't see the app. Each `sb.*` method sends a message to the app, which checks it and sends back an answer. So almost every method returns a `Promise`, even ones that look like they should be instant (like `sb.app.toast`). Always `await` them, or at least attach a `.catch`, so a refusal doesn't go unnoticed.

**Live values are signals.** Things that change while your extension runs (the reading position, the language, who's in the session) are [Preact signals](https://preactjs.com/guide/v10/signals/): objects with a `.value` that always holds the latest value. Reading `.value` inside a Preact component re-renders the component when it changes. Outside a component, use `effect` from `@preact/signals`:

```ts
import { effect } from "@preact/signals";

effect(() => {
  console.log("Now reading", sb.reading.position.value);
});
```

**Main code vs. views.** Your extension runs in two kinds of frame:

- The **background frame** runs `main` once, when the extension starts. It's hidden and lives until the extension is uninstalled or the page reloads.
- A **view frame** is created each time one of your `views` is shown: in a pane, a dialog, or your Settings tab. It's destroyed when that pane or dialog closes.

Both get the same `sb` object, but a few calls only work from the background frame, because they register something that must outlive any one pane: `sb.tools.*`, `sb.discover.registerProvider`, `sb.chats.registerProvider` and `sb.settings.registerPanel`. Calling them from a view rejects with `invalid_request`.

**"Only right after the user interacts with your extension."** Some calls show something the user didn't ask for, or start something noisy, so the app only allows them as a direct response to the user. That means: within a few seconds of the user selecting one of your tools, or while the user is clicking or typing inside one of your panes or dialogs. In practice, call them from a tool's `onSelect` or a click handler in a view. At any other time they reject with `invalid_request`. These calls are marked **Needs interaction** below.

**Ids you choose** (tool ids, pane ids, provider ids, submenu item ids) must be 1–64 characters of letters, digits, `_`, `.` or `-`. They're scoped to your extension, so they can't collide with another extension's.

**Bible references** use:

- `bookId`: a three-character uppercase book code, as in USFM: `GEN`, `PSA`, `MAT`, `JHN`, `1CO`, `REV`.
- `translationId`: the id of a translation in the [Free Use Bible API](https://bible.helloao.org), such as `BSB`.
- `chapter` / `verse`: whole numbers starting at 1 (at most 200).

One naming difference to watch for: the reading position and selected verses call the chapter `chapterNumber`, while every method you call takes `chapter`.

**Titles** (`SandboxTitle`) are either a plain string or `{ key, defaultValue }`, where `key` is looked up in your `extension.json` translations for the user's language, so the app can show it translated. Up to 120 characters.

**JSON values** (`SandboxJsonValue`) are anything `JSON.stringify` can round-trip: strings, numbers, booleans, `null`, arrays and plain objects of those. No functions, `Date`s, `Map`s or class instances.

---

## 2. `defineExtension` and views

```ts
function defineExtension(definition: {
  main?: (sb: SandboxContext) => void | Promise<void>;
  views?: Record<string, (props: SandboxViewProps) => ComponentChild>;
}): SandboxExtension;
```

The module's **default export must be what `defineExtension` returns**. Seed Bible looks for it to start your extension.

- **`main`** runs once in the background frame. Register tools and providers here. If it throws (or its promise rejects), the extension fails to start and the error is logged. The app waits for `main` to finish before treating the extension as ready, so don't `await` anything that waits on the user.
- **`views`** is a map from a name you choose to a Preact component. You show one by name with `sb.panes.open({ view })`, `sb.modals.open({ view })` or `sb.settings.registerPanel(view)`. A name that isn't in `views` shows "Unknown view" in the pane.

Each view component receives:

| Prop      | Type                                  | What it is                                                             |
| --------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `sb`      | `SandboxContext`                      | The same API as `main` gets, for this view's frame.                    |
| `props`   | `SandboxJsonValue`                    | Whatever was passed as `props` when it was opened (`null` if nothing). |
| `surface` | `"pane"` \| `"modal"` \| `"settings"` | Where it's being shown.                                                |
| `paneId`  | `string`                              | The pane's id (for a dialog or settings panel, an id for that).        |

**Theme, fonts and language are applied for you.** Each frame's `<html>` gets the user's `lang` and `dir`, the app's fonts are loaded, and every `--sb-*` CSS variable of the active theme is defined, so `color: var(--sb-font-color)` and `background: var(--sb-background)` match the app and follow it when the user switches to dark mode. The page background and text color are already set this way.

**Styles must be in your bundle**, as inline `style` props or CSS imported with `?inline` and put in a `<style>` element. The frame can't load a separate stylesheet file.

```tsx
export default defineExtension({
  main: async (sb) => {
    await sb.tools.registerToolbarTool({
      id: "hello",
      title: "Hello",
      icon: { material: "waving_hand" },
      onSelect: () =>
        void sb.panes.open({
          view: "hello",
          placement: "side",
          title: "Hello",
        }),
    });
  },
  views: {
    hello: ({ sb }) => <p>{sb.i18n.t("greeting", "Hello!")}</p>,
  },
});
```

---

## 3. The `sb` object

Each entry below says which permission it needs (if any), whether it's main-code only, and whether it needs a user interaction. "Rejects with `x`" means the promise rejects with a [`SandboxError`](#5-errors) whose `code` is `x`. Every call can also reject with `invalid_request` if its arguments are the wrong shape or out of range; that isn't repeated for each one.

### `sb.extensionId`

```ts
readonly extensionId: string;
```

The id Seed Bible knows your extension by: the folder its bundle is hosted in, then `#`, then the `id` from `extension.json`. For example `https://example.com/extensions/#verse-art`. Two copies of an extension with the same `id` hosted in different places are different extensions, with separate storage and permissions.

### `sb.permissions`

Where your extension stands on permissions, and a way to ask for optional ones. See [§4 of the developer guide](./developer-guide.md#asking-for-optional-permissions) for when to use optional permissions.

```ts
permissions: {
  granted: ReadonlySignal<readonly SandboxPermission[]>;
  optional: readonly SandboxPermission[];
  has(permission: SandboxPermission): boolean;
  request(permissions: SandboxPermission | SandboxPermission[]): Promise<boolean>;
};
```

- **`granted`**: what the user has granted right now, including what those imply (`highlights:write` includes `highlights:read`, for example). Updates when the user grants something.
- **`optional`**: what your `extension.json` lists under `optionalPermissions`.
- **`has(permission)`**: `true` if it's granted right now.
- **`request(permissions)`** — **Needs interaction.** Asks the user for one or more optional permissions in one dialog. Resolves:
  - `true`, without asking, if everything is already granted;
  - `true` if the user agrees, `false` if they decline;
  - `false`, without asking, if the user already declined one of them since the page loaded.

  Rejects with `invalid_request` if a permission isn't listed under `optionalPermissions`, or if it isn't a response to the user. Rejects with `limit_exceeded` if a request from your extension is already showing.

When the user turns an optional permission off in Settings, your extension is restarted with the new set. So check `has()` when a feature runs, rather than once at startup.

### `sb.i18n`

Your extension's own translations, from the `translations` section of `extension.json`.

```ts
i18n: {
  language: ReadonlySignal<string>;           // e.g. "en", "es"
  direction: ReadonlySignal<"ltr" | "rtl">;
  t(key: string, defaultValue?: string, values?: Record<string, string | number>): string;
};
```

`t` looks `key` up in the strings for the current language, falls back to `en`, then to `defaultValue`, then to the key itself. It fills `{{name}}` placeholders from `values`:

```ts
sb.i18n.t("verses-found", "Found {{count}} verses", { count: 3 });
```

`t` is synchronous and reads the current language each time, so calling it inside a component re-renders it in the new language when the user switches.

### `sb.app`

```ts
app: {
  isMobile: ReadonlySignal<boolean>;
  toast(message: string): Promise<void>;
};
```

- **`isMobile`**: whether the app is in its phone layout.
- **`toast(message)`**: shows a short, temporary message (1–300 characters), prefixed with your extension's name so the user knows where it came from.

### `sb.identity`

```ts
identity: ReadonlySignal<string | null>;
```

An id for the signed-in user that's **the same every time for your extension, but different for every extension, and not the user's real account id**. Use it to keep per-user data on your own server without learning who the user is. `null` when signed out. Needs no permission.

A friend's or session participant's `id` (see [`sb.friends`](#sbfriends) and [`sb.session`](#sbsession)) is built the same way, so it matches that person's own `sb.identity` in your extension.

### `sb.tools`

Buttons in the app's toolbars. **Main code only.** No permission needed to register one.

```ts
tools: {
  registerToolbarTool(tool: SandboxToolOptions): Promise<SandboxToolHandle>;
  registerVerseToolbarTool(tool: SandboxToolOptions): Promise<SandboxToolHandle>;
  registerQuickTool(tool: SandboxToolOptions): Promise<SandboxToolHandle>;
  registerBelowReaderTool(tool: SandboxToolOptions): Promise<SandboxToolHandle>;
};
```

| Method                     | Where the button appears                               |
| -------------------------- | ------------------------------------------------------ |
| `registerToolbarTool`      | The reader's main toolbar.                             |
| `registerVerseToolbarTool` | The toolbar that appears when the user selects verses. |
| `registerQuickTool`        | The row of compact icons above the reader.             |
| `registerBelowReaderTool`  | Below the chapter text.                                |

**`SandboxToolOptions`:**

| Field        | Type                                   | Notes                                                                                                                           |
| ------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | `string`                               | Required. Registering again with the same id replaces the tool.                                                                 |
| `title`      | `SandboxTitle`                         | Required. The button's label or tooltip.                                                                                        |
| `icon`       | `SandboxIcon`                          | Required. `{ material: "palette" }` (a [Material Symbols](https://fonts.google.com/icons) name) or `{ svg: "<svg …>…</svg>" }`. |
| `priority`   | `number`                               | Optional. Lower comes first; defaults to 500. Clamped to 200–999, so your tools always come after the app's own.                |
| `isVisible`  | `boolean` \| `ReadonlySignal<boolean>` | Optional. Pass a signal and the button shows and hides as it changes.                                                           |
| `isDisabled` | `boolean` \| `ReadonlySignal<boolean>` | Optional. Same, for greying it out.                                                                                             |
| `onSelect`   | `(context) => void \| Promise<void>`   | Called when the user selects it. `context.selection` holds the selected verses, and is empty without `reading:selection`.       |
| `items`      | `SandboxToolItemOptions[]`             | A submenu, instead of `onSelect` (giving both throws). 1–20 items, each `{ id, title, icon?, isDisabled?, onSelect }`.          |

An SVG icon is shown inside an `<img>`, where it can't run scripts or load anything; it must start with `<svg` and be at most 16 KB.

**`SandboxToolHandle`:**

- **`update(patch)`**: changes any field except `id` and `onSelect`. Passing `items` replaces the whole submenu, handlers included.
- **`unregister()`**: removes the button.

An extension can have at most **20 tools**; registering a 21st rejects with `limit_exceeded`. Selecting a tool counts as a user interaction, so `onSelect` can open dialogs, copy to the clipboard, ask for permissions and so on.

```ts
const following = signal(false);
await sb.tools.registerQuickTool({
  id: "follow",
  title: { key: "follow", defaultValue: "Follow along" },
  icon: { material: "sync" },
  isDisabled: following, // updates the button as `following` changes
  onSelect: () => {
    following.value = true;
  },
});
```

### `sb.panes`

Panes are the app's resizable windows. You choose which of your `views` goes inside; the app draws the frame around it (title, close button, and a badge with your extension's name).

```ts
panes: {
  open(options: SandboxPaneOptions): Promise<SandboxPaneHandle>;
  close(paneId: string): Promise<void>;
};
```

**`SandboxPaneOptions`:**

| Field       | Type                                       | Notes                                                                                                                                 |
| ----------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `view`      | `string`                                   | Required. A key of your `views`.                                                                                                      |
| `placement` | `"side"` \| `"floating"` \| `"fullscreen"` | Required.                                                                                                                             |
| `title`     | `SandboxTitle`                             | Required.                                                                                                                             |
| `props`     | `SandboxJsonValue`                         | Optional. Handed to the view. At most 64 KB as JSON.                                                                                  |
| `id`        | `string`                                   | Optional. Opening with an id that's already open replaces that pane's content (with the new `props`) instead of opening a second one. |
| `width`     | `number`                                   | Optional, in pixels (120–4000). Defaults to 480 if only `height` is given.                                                            |
| `height`    | `number`                                   | Optional, in pixels (80–4000). Defaults to 320 if only `width` is given.                                                              |

**`SandboxPaneHandle`:**

- **`paneId`**: the pane's id, for `sb.panes.close`.
- **`close()`**: closes it.
- **`onClose(listener)`**: called once when the pane closes, whether your code or the user closed it.

`close` rejects with `not_found` if the pane isn't open (or isn't yours). An extension can have at most **5 panes** open at once (CasualOS portals count); opening a sixth rejects with `limit_exceeded`. Panes can be opened from main code or from a view.

### `sb.modals`

Dialogs in front of the app, titled "_Your extension's name_: _title_". **Needs interaction.** One at a time: opening a second while one is showing rejects with `limit_exceeded`.

```ts
modals: {
  alert(dialog: { title: string; message: string }): Promise<void>;
  open(dialog: { title: string; view: string; props?: SandboxJsonValue }): Promise<void>;
};
```

- **`alert`** shows a message (1–2,000 characters) with an OK button.
- **`open`** shows one of your `views` in the dialog, with `surface: "modal"`.

Both resolve when the dialog closes. To close an `open` dialog from inside its view, there's no API yet; the user closes it.

### `sb.storage`

A small key/value store that belongs to your extension. The frame has no `localStorage`, so use this instead. No permission needed.

```ts
storage: {
  get<T extends SandboxJsonValue = SandboxJsonValue>(key: string): Promise<T | null>;
  set(key: string, value: SandboxJsonValue): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
};
```

- Keys are 1–200 characters. Values are any JSON value. `get` resolves `null` for a key that isn't set.
- Everything together must fit in **256 KB** (as JSON). A `set` that would go over rejects with `limit_exceeded`.
- **Signed in:** it syncs to a private record in the user's account, so it follows them to their other devices. If two devices write the same key, the later write wins.
- **Signed out:** it stays on this device.
- It's deleted everywhere when the user uninstalls your extension.

Don't store secrets the user types in here: use [sensitive settings](#sbsensitive) instead, which your code never sees.

### `sb.settings`

Your extension's settings, declared in the `settings` section of `extension.json` (see [§8](#8-extensionjson)). The user changes them on your extension's Settings tab.

```ts
settings: {
  get(key: string): Promise<string | number | boolean | null>;
  registerPanel(view: string): Promise<void>;
};
```

- **`get(key)`**: the setting's current value. That's the user's own value if they set one, else the default from the Customization they're using, else the `default` in `extension.json`, else `null`. Always `null` for a sensitive setting (its value never reaches your code) or a key you didn't declare. No permission needed.
- **`registerPanel(view)`** — **Main code only.** Shows one of your `views` on your extension's Settings tab (with `surface: "settings"`), for settings UI the generated form can't express. Calling it again replaces the panel.

Settings aren't pushed to you when they change; read them again when you need them (for example, when a pane opens).

### `sb.sensitive`

Sends an HTTPS request with the user's sensitive settings (API keys, tokens) filled in **by the server**, so the values never enter your extension. No permission needed, beyond declaring the destination in `extension.json` (see [§8](#sensitive-settings)).

```ts
sensitive: {
  fetch(request: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD"; // default "GET"
    body?: unknown;   // sent as JSON; a string is sent as-is; ignored for GET/HEAD
    proxy?: string;   // which `sensitive` entry, if several declare this host
  }): Promise<{ status: number; ok: boolean; contentType: string | null; body: string }>;
};
```

- `url` must be `https:` on a host your `sensitive` section declares. If the user pointed that entry at a different host when saving their values, the request goes there instead, with your URL's path and query.
- It resolves for any HTTP status, like `fetch`; check `ok` or `status`. `body` is the response as text (call `JSON.parse` yourself).
- Rejects with `unavailable` when it can't be sent. The message starts with a reason: `signed_out`, `not_set` (the user hasn't entered the values yet), `unknown_destination` (no `sensitive` entry declares that host), `ambiguous_destination` (several do; pass `proxy`), `invalid_url` or `request_failed`.
- Rejects with `limit_exceeded` if the response is larger than 1 MB.

```ts
const response = await sb.sensitive.fetch({
  url: "https://api.example.com/v1/lookup",
  method: "POST",
  body: { reference: "JHN 3:16" },
});
if (response.ok) {
  const data = JSON.parse(response.body);
}
```

### `sb.reading`

What the user is reading, and a way to take them somewhere.

```ts
reading: {
  position: ReadonlySignal<SandboxReadingPosition | null>;
  selection: ReadonlySignal<SandboxSelectedVerse[]>;
  open(ref: { bookId: string; chapter: number; verse?: number }): Promise<void>;
};
```

| Member      | Permission          | Notes                                                                                                                                                             |
| ----------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `position`  | `reading:position`  | `{ translationId, bookId, chapterNumber }` of the reader in view. Each field can be `null` (nothing open yet). The whole signal is `null` without the permission. |
| `selection` | `reading:selection` | The verses the user has selected, as `{ translationId, bookId, chapterNumber, verse }`. Always empty without the permission.                                      |
| `open(ref)` | `reading:navigate`  | Moves the reader to a book and chapter, and scrolls to `verse` if given. Rejects with `permission_denied` without it.                                             |

### `sb.bible`

Public Bible text. No permission needed.

```ts
bible: {
  chapter(ref: { translationId: string; bookId: string; chapter: number }):
    Promise<{ verses: { number: number; text: string }[] }>;
};
```

Returns each verse of the chapter as plain text. Only verses are included, not section headings. Rejects with `unavailable` if the chapter can't be loaded (an unknown translation, or a book that translation doesn't have).

### `sb.history`

**Needs `reading:history`.**

```ts
history: {
  list(range: { from: number; to: number }): Promise<SandboxReadingEvent[]>;
};
```

The user's reading history between `from` and `to` (milliseconds since 1970, as from `Date.now()`). `to` can be at most a year after `from`. Each event is one sitting with one chapter: `{ bookId, chapter, start, end }`, with `start` and `end` in milliseconds. At most 5,000 events are returned.

### `sb.highlights`

The user's verse highlights. Reading needs **`highlights:read`**; adding and removing need **`highlights:write`** (which can only be optional).

```ts
highlights: {
  colors(): Promise<string[]>;
  list(ref: { translationId: string; bookId: string; chapter: number }): Promise<SandboxHighlight[]>;
  add(ref: { translationId; bookId; chapter; verses: number[]; colorId: string }): Promise<void>;
  remove(ref: { translationId; bookId; chapter; verses: number[] }): Promise<void>;
};
```

- **`colors()`** (no permission): the highlight color ids the current theme offers. Use one of these as `colorId`; any other rejects with `invalid_request`.
- **`list(ref)`**: the chapter's highlights, each `{ verse, colorId }`, where `verse` is a single verse number or an inclusive `[start, end]` range.
- **`add(ref)`**: highlights 1–200 verses in one color.
- **`remove(ref)`**: removes the highlight from those verses.

### `sb.notes`

The user's notes on a chapter. Reading needs **`notes:read`**; writing needs **`notes:write`**. Both can only be optional, because notes are private writing.

```ts
notes: {
  list(ref: { bookId: string; chapter: number }): Promise<SandboxNote[]>;
  create(note: { bookId: string; chapter: number; verses?: number[]; text: string }): Promise<{ id: string }>;
  update(note: { id: string; bookId: string; chapter: number; text: string }): Promise<void>;
  delete(note: { id: string; bookId: string; chapter: number }): Promise<void>;
};
```

- Notes are **plain text** here. Formatting in notes the user wrote is dropped when you read them; blank lines in text you write become paragraphs.
- **`list`** resolves `[]` when the user is signed out. Each `SandboxNote` is `{ id, verses, text, createdAt, updatedAt, addedByThisExtension }`. `verses` is `null` for a note on the whole chapter.
- **`create`** attaches the note to `verses`, or to the whole chapter if omitted. Text is 1–10,000 characters. The note is marked as your extension's, so the user can tell where it came from.
- **`update` / `delete`** only work on notes your extension created (`addedByThisExtension: true`). Others reject with `permission_denied`; an id that isn't in that chapter rejects with `not_found`.
- **Writing needs the user to be signed in.** `create`, `update` and `delete` reject with `unavailable` when they aren't, rather than prompting them to sign in.

### `sb.saves`

The user's saved verses and chapters (bookmarks). Reading needs **`saves:read`**; writing needs **`saves:write`** (which can only be optional).

```ts
saves: {
  list(): Promise<SandboxSave[]>;
  add(save: { translationId; bookId; chapter; verse?: number | [number, number]; categories?: string[] }): Promise<void>;
  remove(id: string): Promise<void>;
};
```

- **`list()`**: every save, each `{ id, translationId, bookId, chapter, verse, categories, createdAt }`. `verse` is `null` for a whole chapter, a number, or an inclusive `[start, end]` range.
- **`add(save)`**: saves a chapter, verse or range, optionally in 1–10 categories (each 1–64 characters).
- **`remove(id)`**: rejects with `not_found` if there's no save with that id.
- `add` and `remove` reject with `unavailable` when the user is signed out.

### `sb.profile`

**Needs `profile:read`** (which can only be optional, since it identifies the user).

```ts
profile: { get(): Promise<SandboxProfile | null> };
```

Resolves `{ userId, name, pictureUrl }`, where **`userId` is the user's real account id**, or `null` when signed out. If you only need to tell users apart, use [`sb.identity`](#sbidentity) instead, which needs no permission.

### `sb.friends`

**Needs `friends:read`** (optional only).

```ts
friends: { list(): Promise<SandboxFriend[]> };
```

The user's friends, each `{ id, name, pictureUrl }`. `id` is pseudonymous like [`sb.identity`](#sbidentity): stable for your extension, not their real id, and equal to that friend's own `sb.identity` in your extension. `name` and `pictureUrl` can be `null`. Resolves `[]` when signed out.

### `sb.session`

**Needs `session:read`** (optional only).

```ts
session: {
  current: ReadonlySignal<SandboxSharedSession | null>;
}
```

The shared reading session open in the current tab, kept up to date, as `{ participants }`. `null` when there's no shared session, and always `null` without the permission. Each participant is:

| Field      | Type             | Notes                                                                                                                       |
| ---------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`       | `string`         | Pseudonymous, as for friends. A guest who isn't signed in gets an id for their connection, which changes if they reconnect. |
| `name`     | `string \| null` | `null` if they haven't set a name or aren't signed in.                                                                      |
| `isHost`   | `boolean`        | Whether they started the session.                                                                                           |
| `isActive` | `boolean`        | Whether they're connected right now.                                                                                        |
| `isYou`    | `boolean`        | Whether this is the user your extension is running for.                                                                     |

At most 100 participants are listed.

### `sb.discover`

Adds your content to the Discover panel, which shows material related to the chapter being read. **Main code only. Needs `reading:position`**, since your provider is told which chapter is open every time it's asked.

```ts
discover: {
  registerProvider(provider: {
    id: string;
    title: string;          // 1–100 characters
    description: string;    // up to 300 characters
    discover(request: SandboxDiscoverRequest): SandboxDiscoverResult[] | Promise<SandboxDiscoverResult[]>;
    onSelect?(resultId: string): void;
  }): Promise<{ unregister(): Promise<void> }>;
};
```

The app calls `discover` whenever the Discover panel needs results, with `{ providerId, translationId, bookId, chapter, language }`. Return up to 50 results, each one of:

| `type`              | Fields                                                                              | Shown as                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `"content"`         | `id`, `title`, `description`, `reference`, and optional `verses`, `author`, `image` | A card. Selecting it calls your `onSelect(id)`. (This doesn't count as a user interaction, so open a pane from it rather than a dialog.) |
| `"cross-reference"` | `reference`, `crossReference`                                                       | A link from one passage to another.                                                                                                      |
| `"study-note"`      | `reference`, `text` (1–5,000 characters)                                            | A note on the passage.                                                                                                                   |

`reference` is a [`SandboxReference`](#4-shared-types). `image` must be an `https:` URL on one of your `network` hosts, or it's dropped. `author` defaults to your extension's name.

If `discover` takes longer than **5 seconds**, throws, or returns something that doesn't match, your provider shows nothing for that request (the error is logged in the console). Results are data, not markup: you can't render your own UI in the Discover panel.

### `sb.chats`

Adds a participant to the app's chats, like an assistant the user can talk to. **Main code only. Needs `chat:respond`.** Taking part in chats with other people (`shared: true`) also needs **`chat:shared`**, which can only be optional.

```ts
chats: {
  registerProvider(provider: {
    id: string;
    name: string;           // 1–100 characters, shown as the participant's name
    shared?: boolean;       // may be added to chats with other people
    respond(request: SandboxChatRequest): string | null | Promise<string | null>;
  }): Promise<{ unregister(): Promise<void> }>;
};
```

Your provider only sees chats the user adds it to. Each time it's asked to reply, `respond` gets:

- `chatId`: which chat.
- `shared`: whether other people are in it.
- `messages`: the last 100 text messages, oldest first, each `{ author, fromThisProvider, text, timeMs }`. `author` is a display name or `null`.

Return the reply as a string (at most 20,000 characters are shown), or `null` (or an empty string) to say nothing. A reply is one complete message; streaming isn't supported. If `respond` takes longer than **60 seconds** or throws, no reply is posted.

Registering with `shared: true` without `chat:shared` rejects with `permission_denied`.

### `sb.audio`

The app's own audio player. **Needs `audio:playback`.** What you play shows in the reader's playback controls, where the user can pause, scrub and stop it; it keeps playing when your pane closes, and starting it pauses whatever else the app was playing. Your extension plays one thing at a time: starting another replaces it.

```ts
audio: {
  play(url: string): Promise<{ finished: boolean }>;
  playNarration(ref: { translationId; bookId; chapter; reader?: string }): Promise<{ finished: boolean }>;
  narrators(ref: { translationId; bookId; chapter }): Promise<string[]>;
  readAloud(ref: { translationId; bookId; chapter; fromVerse?: number; toVerse?: number }): Promise<{ finished: boolean }>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(position: number): Promise<void>;
  stop(): Promise<void>;
  playback: ReadonlySignal<SandboxPlayback | null>;
};
```

| Method               | Notes                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `play(url)`          | **Needs interaction.** An audio file. Must be `https:` on one of your `network` hosts, since it plays in the app's page.                                                                          |
| `narrators(ref)`     | The names of the readers who recorded this chapter. `[]` if none did.                                                                                                                             |
| `playNarration(ref)` | **Needs interaction.** The app's recorded narration, by `reader` (a name from `narrators`) or the first available. Rejects with `not_found` if the chapter has none, so fall back to `readAloud`. |
| `readAloud(ref)`     | **Needs interaction.** The app's text-to-speech, for the whole chapter or `fromVerse`–`toVerse`.                                                                                                  |
| `pause()` / `stop()` | Only ever affect what your extension is playing.                                                                                                                                                  |
| `resume()`           | **Needs interaction.**                                                                                                                                                                            |
| `seek(position)`     | Seconds, or for `readAloud`, the index of the verse to read.                                                                                                                                      |

Each `play…` method **resolves when playback ends**: `finished: true` if it played to the end, `false` if it was stopped (by you, by the user, by something else taking over that tab's player, or by the tab closing). Calls reject with `unavailable` if there's no reader open to play in.

`playback` holds what your extension is playing, or `null`: `{ kind, unit, isPlaying, position, duration }`, where `kind` is `"file"`, `"narration"` or `"speech"`, `unit` is `"seconds"` or (for speech) `"verses"`, and `duration` is `null` until the audio reports its length.

Unlike the app's own narration, yours doesn't highlight verses as they're read or count toward reading history. (A frame can also play audio itself with an `<audio>` element from a `network` host, without any permission, but it stops when the frame closes and has no controls in the app.)

### `sb.clipboard`

**Needs `clipboard:write`. Needs interaction.**

```ts
clipboard: { writeText(text: string): Promise<void> };
```

Copies up to 100,000 characters of text to the clipboard. Reading the clipboard isn't possible.

### `sb.devices`

The microphone and camera, through a dialog the app shows. **Needs interaction.** Your frames can't use `getUserMedia` themselves, so instead the app shows its own dialog, titled with your extension's name. The device is only on while that dialog is open, nothing is captured until the user presses the button, and you only get the result.

```ts
devices: {
  recordAudio(options?: { maxSeconds?: number }): Promise<Blob | null>;
  takePhoto(): Promise<Blob | null>;
};
```

- **`recordAudio`** needs **`device:microphone`**. Records up to `maxSeconds` (default 60, at most 300).
- **`takePhoto`** needs **`device:camera`**. Resolves a JPEG.
- Both resolve `null` if the user cancels, and reject with `unavailable` if the device can't be used (for example, the user blocked it in the browser). Only one can be open at a time (`limit_exceeded` otherwise).
- Both permissions can only be optional.

There's no live stream, so real-time uses (speech recognition while the user talks, video calls) aren't possible.

### `sb.portals`

Opens a CasualOS grid or map portal (an `ao.bot` pattern) in a pane the app draws. **Needs `embed:casualos`.**

```ts
portals: {
  open(options: SandboxPortalOptions): Promise<SandboxPortalHandle>;
};
```

**`SandboxPortalOptions`:**

| Field                   | Type                                       | Notes                                                                                                                                            |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `portalType`            | `"grid"` \| `"map"`                        | Required.                                                                                                                                        |
| `placement`             | `"side"` \| `"floating"` \| `"fullscreen"` | Required.                                                                                                                                        |
| `title`                 | `SandboxTitle`                             | Required.                                                                                                                                        |
| `pattern`               | `{ name }` \| `{ aux: "https://…" }`       | Optional. A published pattern by name, or an `.aux` file by URL. Without one, the portal opens empty.                                            |
| `portal`                | `string`                                   | Optional. The portal's name. Defaults to `"home"`.                                                                                               |
| `inst`                  | `string`                                   | Optional. The CasualOS instance. Without it, each open gets a fresh one.                                                                         |
| `query`                 | `Record<string, string>`                   | Optional. Up to 20 extra query parameters for the pattern. Can't set `inst`, `staticInst`, `gridPortal`, `mapPortal`, `pattern` or `patternAux`. |
| `id`, `width`, `height` |                                            | As for [`sb.panes.open`](#sbpanes).                                                                                                              |

The handle has everything a [pane handle](#sbpanes) has, plus:

- **`send(message)`**: posts a JSON message (at most 64 KB) into the portal. Rejects with `unavailable` if the portal hasn't finished loading yet.
- **`onMessage(listener)`**: called with each message the pattern sends with `os.sendEmbedMessage`.

The portal isn't inside your sandbox: the pattern runs on `ao.bot`, with whatever `ao.bot` itself can do in the user's browser. Portals count toward the 5-pane limit.

---

## 4. Shared types

All of these are exported as types from `seed-bible/extensions`.

```ts
type SandboxTitle = string | { key: string; defaultValue: string };
type SandboxIcon = { material: string } | { svg: string };

interface SandboxReadingPosition {
  translationId: string | null;
  bookId: string | null;
  chapterNumber: number | null;
}

interface SandboxSelectedVerse {
  translationId: string | null;
  bookId: string;
  chapterNumber: number;
  verse: number;
}

interface SandboxVerseRef {
  bookId: string;
  chapter: number;
  verse?: number;
}

/** A passage, possibly spanning verses or chapters. Used by Discover. */
interface SandboxReference {
  bookId: string;
  chapter: number;
  verse?: number;
  endChapter?: number;
  endVerse?: number;
}

interface SandboxHighlight {
  verse: number | [number, number];
  colorId: string;
}

interface SandboxNote {
  id: string;
  verses: number[] | null; // null: the whole chapter
  text: string;
  createdAt: number | null; // ms since 1970
  updatedAt: number | null;
  addedByThisExtension: boolean;
}

interface SandboxSave {
  id: string;
  translationId: string;
  bookId: string;
  chapter: number;
  verse: number | [number, number] | null;
  categories: string[];
  createdAt: number;
}

interface SandboxReadingEvent {
  bookId: string;
  chapter: number;
  start: number; // ms since 1970
  end: number;
}

interface SandboxProfile {
  userId: string; // the real account id
  name: string;
  pictureUrl: string | null;
}

interface SandboxFriend {
  id: string; // pseudonymous
  name: string | null;
  pictureUrl: string | null;
}

interface SandboxPlayback {
  kind: "file" | "narration" | "speech";
  unit: "seconds" | "verses";
  isPlaying: boolean;
  position: number;
  duration: number | null;
}
```

---

## 5. Errors

When the app refuses or can't complete a call, the promise rejects with a `SandboxError`:

```ts
class SandboxError extends Error {
  readonly code:
    | "permission_denied"
    | "invalid_request"
    | "not_found"
    | "limit_exceeded"
    | "unavailable"
    | "internal";
}
```

| `code`              | What it means                                                                                                                                       | What to do                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `permission_denied` | The call needs a permission your extension doesn't have right now (or, for notes, it isn't your note).                                              | Check `sb.permissions.has()` first, or ask with `sb.permissions.request()`. |
| `invalid_request`   | The arguments are the wrong shape or out of range; a main-only call came from a view; or a call that needs a user interaction came at another time. | A bug in your code. The `message` says exactly what was wrong.              |
| `not_found`         | The thing you named doesn't exist: a pane that's closed, a note or save id, narration for a chapter that has none.                                  | Handle it as an ordinary outcome.                                           |
| `limit_exceeded`    | Too many tools or panes, storage is full, a dialog is already open, or a response is too large. See [§6](#6-limits).                                | Free something up, or do less at once.                                      |
| `unavailable`       | Not possible right now: the user is signed out, a service failed, a device couldn't be used, or there's no reader open.                             | Tell the user, and let them try again later.                                |
| `internal`          | Something went wrong in the app itself.                                                                                                             | Report it to Seed Bible.                                                    |

```ts
import { SandboxError } from "seed-bible/extensions";

try {
  await sb.notes.create({ bookId: "JHN", chapter: 3, text: "…" });
} catch (err) {
  if (err instanceof SandboxError && err.code === "unavailable") {
    void sb.app.toast(sb.i18n.t("sign-in-to-save", "Sign in to save notes."));
  } else {
    throw err;
  }
}
```

Errors thrown inside your own callbacks (a tool's `onSelect`, a provider's `discover` or `respond`) don't reach the user. They're logged to the browser console, and for providers the app treats them as "no results" or "no reply".

**If your background frame stops responding** (it crashes, or a long synchronous loop blocks it), the app notices within about 30 seconds, stops your extension, and tells the user. It stays stopped until the page reloads.

---

## 6. Limits

| What                                                             | Limit                                |
| ---------------------------------------------------------------- | ------------------------------------ |
| Tools per extension                                              | 20                                   |
| Submenu items per tool                                           | 20                                   |
| Open panes and portals per extension                             | 5                                    |
| Dialogs open at once (`sb.modals`)                               | 1                                    |
| Microphone or camera dialogs open at once                        | 1                                    |
| `props` for a pane, or a portal message                          | 64 KB as JSON                        |
| `sb.storage`, all keys together                                  | 256 KB as JSON                       |
| Storage key length                                               | 200 characters                       |
| Toast message                                                    | 300 characters                       |
| Title                                                            | 120 characters                       |
| SVG icon                                                         | 16 KB                                |
| Note text                                                        | 10,000 characters                    |
| Clipboard text                                                   | 100,000 characters                   |
| `sb.sensitive.fetch` response                                    | 1 MB                                 |
| `sb.history.list` range / results                                | 1 year / 5,000 events                |
| Discover results per request / time to answer                    | 50 / 5 seconds                       |
| Chat messages given to `respond` / time to answer / reply length | 100 / 60 seconds / 20,000 characters |
| Recording length                                                 | 60 s by default, 300 s at most       |
| Session participants listed                                      | 100                                  |

---

## 7. Permissions at a glance

"Required OK" means the permission can go under `permissions` in `extension.json`, so the user grants it when installing. "Optional only" means it must go under `optionalPermissions` and be asked for with `sb.permissions.request` when the feature that needs it is used; a manifest that lists it under `permissions` won't install.

| Permission          | Unlocks                                                        | Can be required | Includes          |
| ------------------- | -------------------------------------------------------------- | --------------- | ----------------- |
| `reading:position`  | `sb.reading.position`, `sb.discover.registerProvider`          | Yes             |                   |
| `reading:selection` | `sb.reading.selection`, selected verses in a tool's `onSelect` | Yes             |                   |
| `reading:navigate`  | `sb.reading.open`                                              | Yes             |                   |
| `reading:history`   | `sb.history.list`                                              | Yes             |                   |
| `highlights:read`   | `sb.highlights.list`                                           | Yes             |                   |
| `highlights:write`  | `sb.highlights.add`, `sb.highlights.remove`                    | Optional only   | `highlights:read` |
| `notes:read`        | `sb.notes.list`                                                | Optional only   |                   |
| `notes:write`       | `sb.notes.create`, `update`, `delete`                          | Optional only   | `notes:read`      |
| `saves:read`        | `sb.saves.list`                                                | Yes             |                   |
| `saves:write`       | `sb.saves.add`, `sb.saves.remove`                              | Optional only   | `saves:read`      |
| `profile:read`      | `sb.profile.get`                                               | Optional only   |                   |
| `chat:respond`      | `sb.chats.registerProvider`                                    | Yes             |                   |
| `chat:shared`       | `shared: true` on a chat provider                              | Optional only   | `chat:respond`    |
| `friends:read`      | `sb.friends.list`                                              | Optional only   |                   |
| `session:read`      | `sb.session.current`                                           | Optional only   |                   |
| `audio:playback`    | `sb.audio.*`                                                   | Yes             |                   |
| `clipboard:write`   | `sb.clipboard.writeText`                                       | Yes             |                   |
| `embed:casualos`    | `sb.portals.*`                                                 | Yes             |                   |
| `device:microphone` | `sb.devices.recordAudio`                                       | Optional only   |                   |
| `device:camera`     | `sb.devices.takePhoto`                                         | Optional only   |                   |

**Needs no permission:** `sb.extensionId`, `sb.permissions`, `sb.i18n`, `sb.app`, `sb.identity`, `sb.tools`, `sb.panes`, `sb.modals`, `sb.storage`, `sb.settings`, `sb.sensitive`, `sb.bible`, `sb.highlights.colors`.

`seed-bible-extension-scripts check` (which `build` and `publish` run) reads your code for these calls and stops with an error if one needs a permission your `extension.json` doesn't declare.

---

## 8. `extension.json`

The manifest sits at the root of your project. `seed-bible-extension-scripts` validates it, and adds the `integrity` hash when it builds or publishes, so you don't write that yourself.

```json
{
  "id": "verse-art",
  "version": "1.2.0",
  "icon": "icon.png",
  "permissions": ["reading:selection"],
  "optionalPermissions": ["clipboard:write", "highlights:write"],
  "network": ["api.verse-art.example", "cdn.verse-art.example"],
  "settings": {
    "style": {
      "type": "string",
      "default": "watercolor",
      "enum": ["watercolor", "ink"]
    },
    "apiKey": { "type": "string", "sensitive": "verseArtApi" }
  },
  "sensitive": {
    "verseArtApi": {
      "host": "api.verse-art.example",
      "requestMapping": { "headers.x-api-key": "apiKey" }
    }
  },
  "translations": {
    "en": {
      "title": "Verse Art",
      "description": "Turn verses into shareable images.",
      "setting-style-title": "Style",
      "setting-style-option-watercolor": "Watercolor",
      "setting-style-option-ink": "Ink",
      "setting-apiKey-title": "API key",
      "sensitive-verseArtApi-title": "Verse Art service"
    }
  }
}
```

| Field                 | Notes                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | Required. Your extension's name, unique among your own extensions. Combined with where it's hosted to make [`sb.extensionId`](#sbextensionid).                                                                                                                                                                                |
| `version`             | A string, such as `"1.2.0"`.                                                                                                                                                                                                                                                                                                  |
| `icon`                | A square image in your project (`.png`, `.svg`, `.webp` or `.jpg`, under 256 KB), or an `https:` link to one. Shown wherever your extension is listed and in the install dialog, instead of colored initials. `publish` uploads it, `package` copies it next to the bundle, and `check` refuses one Seed Bible couldn't show. |
| `permissions`         | Permissions the user must grant to install. Only the "Can be required" ones from [§7](#7-permissions-at-a-glance).                                                                                                                                                                                                            |
| `optionalPermissions` | Permissions you may ask for later with `sb.permissions.request`. A permission in both lists counts as required.                                                                                                                                                                                                               |
| `network`             | Every host your frames may contact (`fetch`, images, media, fonts), as bare hosts like `api.example.com` or `example.com:8443`. Everything else is blocked. Can't be optional.                                                                                                                                                |
| `settings`            | Settings the user can change on your extension's Settings tab. See below.                                                                                                                                                                                                                                                     |
| `sensitive`           | Destinations for sensitive settings. See below.                                                                                                                                                                                                                                                                               |
| `translations`        | Strings by language code. `title` and `description` name your extension in the app; other keys are yours for `sb.i18n.t` and `{ key }` titles. `en` is the fallback.                                                                                                                                                          |

**A manifest that names a permission this version of Seed Bible doesn't know won't install**, rather than install without it. A sandboxed extension can't declare `dependencies`, and `autoinstall` is ignored: it's never installed without the user being asked.

**Network requests** from your frames arrive with `Origin: null`, so the server must allow that in its CORS headers (`Access-Control-Allow-Origin: *` does).

### Settings

Each key of `settings` is a setting, with one of these types:

| `type`      | Optional fields                                                                                                   | Form control                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `"string"`  | `default`; `enum` (a list of allowed values); `sensitive` (see below; can't be combined with `default` or `enum`) | Text field, or a dropdown with `enum` |
| `"number"`  | `default`; `minimum` and `maximum` (inclusive); `multipleOf` (`1` means whole numbers)                            | Number field                          |
| `"boolean"` | `default`                                                                                                         | Switch                                |

The form labels each setting from your translations: `setting-<key>-title`, `setting-<key>-description`, and for `enum` options, `setting-<key>-option-<value>`. A value the user stored that no longer fits the definition (after you change it) is ignored, and the next fallback is used.

<a id="sensitive-settings"></a>

### Sensitive settings

A string setting with `"sensitive": "<entry>"` holds something secret, like an API key. Its value is stored on the server in a CasualOS proxy record, never sent back to the browser, and never readable by your extension: `sb.settings.get` returns `null` for it. Instead, the server adds it to requests you send with [`sb.sensitive.fetch`](#sbsensitive).

Each entry of the `sensitive` section is one destination, shared by every setting that names it:

- **`host`**: where requests go (`api.example.com`, or with a port). The user can choose a different host when they save their values; your code keeps using this one in URLs, and the request is redirected.
- **`requestMapping`**: where each setting's value goes in the request, as `"<request property>": "<setting key>"`. The supported properties are:
  - `headers.authorization`: the `Authorization` header, as-is.
  - `headers.authorization.bearer`: the `Authorization` header, as `Bearer <value>`.
  - `headers.x-<name>`: a custom header such as `x-api-key`. Headers that could spoof routing or the sender (`x-forwarded-*`, `x-real-ip`, `x-original-url` and similar) aren't allowed.
  - `body.<path>`: a property of the JSON body, such as `body.client_id`.

The Settings tab labels the group with `sensitive-<entry>-title`.

---

## 9. Testing with `createTestHost`

`createTestHost` runs your extension in a unit test, against a stand-in for Seed Bible that speaks the same protocol as the app. Every call is checked against the permissions the test grants, so a missing permission fails the test the way it would fail in the app.

```ts
import { createTestHost } from "seed-bible/extensions/testing";

function createTestHost(
  extension: SandboxExtension,
  options?: TestHostOptions
): Promise<TestHost>;
```

**`TestHostOptions`:**

| Option          | Default            | What it does                                                                                                          |
| --------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `granted`       | `[]`               | Permissions granted from the start, as if required by the manifest.                                                   |
| `optional`      | `[]`               | What the manifest lists under `optionalPermissions`.                                                                  |
| `allowRequests` | `true`             | How the "user" answers `sb.permissions.request`. `false` declines.                                                    |
| `state`         | sensible defaults  | The app state frames start with: `position`, `selection`, `language`, `identity`, `session`, `isMobile`, `strings`, … |
| `settings`      | `{}`               | Values for `sb.settings.get`.                                                                                         |
| `answers`       | none               | Answers for calls the stand-in doesn't simulate, or replacements for ones it does. See below.                         |
| `extensionId`   | `"test-extension"` | The value of `sb.extensionId`.                                                                                        |

**What the stand-in simulates:** tools, panes and portals, toasts, `sb.reading.open`, storage, settings, the clipboard, Discover and chat provider registration, and permission requests. Everything else (Bible text, highlights, notes, saves, history, profile, friends, audio, devices, modals, sensitive requests) needs an answer in `answers`, keyed by the protocol's method name. Without one, the call fails with a message telling you which method to answer:

```ts
const host = await createTestHost(extension, {
  answers: {
    "bible.chapter": () => ({
      verses: [{ number: 16, text: "For God so loved…" }],
    }),
    "highlights.list": () => [{ verse: 16, colorId: "yellow" }],
  },
  granted: ["highlights:read"],
});
```

The method name is the `sb` path without the `sb.`: `sb.notes.create` is `"notes.create"`, `sb.audio.readAloud` is `"audio.readAloud"`. (`sb.modals.alert` and `sb.modals.open` are both `"modals.open"`.)

**`TestHost`** records what your extension did and lets you act as the user:

| Member                                                        | What it is                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ready`                                                       | Settles when `main` has finished; rejects with its error.                                            |
| `tools`                                                       | Registered tools by id, with their current definition (title, icon, `visible`, `disabled`, `items`). |
| `panes`                                                       | Open panes and portals by pane id: `{ paneId, view, options }`. `view` is `null` for a portal.       |
| `toasts`                                                      | Every toast message, in order.                                                                       |
| `opened`                                                      | Every `sb.reading.open` reference.                                                                   |
| `storage`                                                     | The extension's storage, as a `Map`.                                                                 |
| `clipboard`                                                   | Everything copied.                                                                                   |
| `calls`                                                       | Every call that passed the permission check, as `{ method, params }`.                                |
| `requests`                                                    | Every permission prompt the user would have seen, with the answer.                                   |
| `discoverProviders`, `chatProviders`                          | The ids of registered providers.                                                                     |
| `granted()`                                                   | What's granted now, implied permissions included.                                                    |
| `selectTool(id, { itemId?, selection? })`                     | Selects a tool (or a submenu item) and waits for its handler.                                        |
| `setState(partialState)`                                      | Changes the app state, e.g. moves the reader with `{ position }`.                                    |
| `discover(providerId, request)`                               | Asks a Discover provider for results.                                                                |
| `chat(providerId, request)`                                   | Asks a chat provider for its reply.                                                                  |
| `renderView(view, { props?, surface?, paneId?, container? })` | Renders a view into the test's document with its own `sb`; returns the element.                      |
| `flush()`                                                     | Waits until every message already sent between the extension and the stand-in has arrived.           |
| `dispose()`                                                   | Closes everything. Call it after each test.                                                          |

In the stand-in, every call counts as a user interaction, so a test doesn't have to simulate clicks to use calls marked **Needs interaction**.

```ts
import extension from "../src/main";
import { createTestHost } from "seed-bible/extensions/testing";

it("copies the selected verse reference", async () => {
  const host = await createTestHost(extension, {
    granted: ["reading:selection"],
    optional: ["clipboard:write"],
  });
  await host.ready;
  await host.selectTool("copy-ref", {
    selection: [
      { translationId: "BSB", bookId: "JHN", chapterNumber: 3, verse: 16 },
    ],
  });
  expect(host.requests).toEqual([
    { permissions: ["clipboard:write"], granted: true },
  ]);
  expect(host.clipboard).toEqual(["John 3:16"]);
  host.dispose();
});
```

For complete, working tests, see `test/unit/sandboxed-example-extension/` and the `src/init.test.tsx` that `create-seed-bible-extension` generates.
