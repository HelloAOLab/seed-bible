## Context

There are two kinds of extensions, and their manifests reach the app by different routes:

- **Built-in** (`packages/*-extension/`). `script/lib/vite-plugin-extensions.ts` reads each `extension.json` at build time. `script/lib/extensionsModule.ts` then generates the `virtual:@extensions` module, inlining a trimmed copy of each manifest (`trimMeta`) as a JSON literal. `trimMeta` keeps only `id`, `dependencies`, `autoinstall`, `settings`, `sensitive` and the English `title`/`description`, so an `icon` line is dropped today. The rest of the translations sit behind `loadFullTranslations()`. That is a dynamic import of the whole `extension.json`, run only when the extension is installed.
- **Link-installed** (sandboxed). These come as an `ExtensionSet` JSON fetched from a URL, and their manifest includes all translations. `ExtensionManager.discoverExtensionSet` resolves `meta.icon` against the set's URL and keeps it only if `isExtensionSetUrl` passes (`withResolvedIcon`). On the tooling side, `seed-bible-extension-scripts` handles the icon in `lib/icon.ts` (types, 256 KB limit, `checkIcon`, `readIcon`), plus `dev`, `package`, `publish` and `check`.

Display already works: `ExtensionTile` (in `ExtensionConsentModal.tsx`) renders `meta.icon` and falls back to initials when the image fails. The main app sets no `img-src` CSP, so images from any `https:` host load.

## Goals / Non-Goals

**Goals:**

- One manifest format for `icon` and `screenshots`, shared by both kinds of extension.
- Bad image references in built-in extensions fail at build time, not on a user's screen.
- Screenshot images cost nothing until someone opens an extension's page.

**Non-Goals:**

- Showing screenshots anywhere other than the extension's page. That rules out the extension list rows, the install consent dialog and the hosted install page that `package` writes (`sitePackage.ts`); those are possible follow-ups.
- Video or animated previews.
- Resizing or compressing images during the build. Authors provide sensibly sized files, and the size limits enforce that.
- Adding Bible Atlas's own icon and screenshots. That happens on its PR after this lands.

## Decisions

### Manifest shape: `screenshots: [{ src, caption? }]`

Every entry is an object, even one without a caption, so the format never has two shapes to parse. `caption` is a translation key, not text: the manifest's `translations` already carry every other string, and translators work from that file. The key must exist in `translations.en`, because English is the fallback language.

- _Alternative:_ allow a bare string (`"shots/a.png"`) as well as an object. It's a little shorter to write, but every reader would have to handle both shapes. Rejected.
- _Alternative:_ captions written as plain English in the manifest. That's simpler, but it can't be translated. Rejected.

### Built-in files become bundled assets through Vite `?url` imports

For each built-in extension with an icon or screenshots, `generateEntryModuleSource` emits imports like this:

```js
import asset_3 from "<importBase>/icon.svg?url";
```

It then writes the manifest as a JS object rather than pure JSON, so `icon: asset_3` can reference the import. Vite then:

- copies the file into the build under a content-hashed name;
- returns its public path, which also works in the native build;
- reloads the module in dev when the file changes.

The same imports are emitted in the SSR build. There, Vite returns the same public path without copying the file, so the server-rendered markup matches the client.

- _Alternative:_ copy the files to `public/` in a build step. That needs its own hashing, cache busting and dev serving, all of which Vite already does. Rejected.
- _Alternative:_ inline images as `data:` URLs. That would bloat the entry chunk that every page load pays for. Rejected.

### Built-in validation runs in the Vite plugin, with limits copied from extension-scripts

`vite-plugin-extensions.ts` checks each built-in manifest's `icon` and `screenshots` when it reads them, and fails the build (`this.error`) with the extension id, the entry and the reason. The rules match the extension-scripts `check` command.

`seed-bible-extension-scripts` is published to npm and doesn't depend on the app, so the limits are duplicated (types, 256 KB for the icon, 1 MB per screenshot, 8 screenshots). A unit test fails if the two copies drift. This is the same pattern `manifestPolicy.ts` already uses for permissions.

- _Alternative:_ `script/lib` imports `lib/icon.ts` straight from the scripts package. That couples the app build to the published package's internals, which the current code avoids. Rejected.

### Caption keys stay inline for English; other languages load with the page

`trimMeta` keeps the screenshot entries and adds each caption key's English text to the inline English block. The extensions list stays cheap: a few short strings per extension that has captions.

When the extension's page is open in another language, the page calls a new `ExtensionManager` method. That method runs the extension's `loadFullTranslations()` once, without installing the extension, and adds those translations to i18next. The page re-renders with the localized captions, and English shows until they arrive. Link-installed sets already carry full translations, so nothing needs loading for them.

- _Alternative:_ add captions to the per-language list modules (`loadListTranslations`). Every list view would then pay for strings that only the extension's page uses. Rejected.

### Link-installed screenshots follow the icon's path end to end

- **Runtime:** `withResolvedIcon` becomes `withResolvedMedia`. It resolves the icon and each screenshot `src` against the set URL, drops any that fail `isExtensionSetUrl`, and drops a malformed `screenshots` field rather than rejecting the whole extension. `isExtensionMeta` stays lenient about both fields.
- **Tooling:** `lib/icon.ts` becomes `lib/images.ts`, with one checker and one reader parameterized by kind (icon or screenshot). On top of that:
  - `dev` serves `/screenshots/<index><ext>`;
  - `package` writes `screenshot-<hash><ext>`;
  - `publish` uploads each screenshot with the same records call it uses for the icon.

### Viewer: a new `ScreenshotViewer` in `components/`, rendered through `PortalComponent`

- **Placement:** the viewer is a full-screen overlay with `role="dialog"` and `aria-modal="true"`, rendered through the existing `PortalComponent` so it sits above the settings sheet, as other overlays do. The app has no native `<dialog>` usage yet. Following the existing overlay pattern keeps stacking (`--sb-*` layer tokens) consistent.
- **Behavior:**
  - focus is trapped inside the viewer and restored to the opening thumbnail on close;
  - the arrow keys move between screenshots and are mirrored when `dir="rtl"`;
  - a swipe counts when the horizontal travel is over 40 px and wider than the vertical travel, using pointer events;
  - Escape and clicking the backdrop close it.
- **Shared component:** it's exported from `components/index.tsx`, because extensions may want the same viewer. It's styled only with `--sb-*` tokens.

The strip on the page is a plain scrolling row of buttons, each wrapping an `<img loading="lazy">`. A thumbnail that fires `error` is removed from the list given to the viewer.

## Risks / Trade-offs

- [Large screenshots slow the extension page on mobile data] → The 1 MB cap, lazy loading of thumbnails, and docs recommending WebP at about 1280 px on the long edge.
- [Hand-written JS object output in `generateEntryModuleSource` could break escaping] → Keep `toJsLiteral` for every value, and only splice in generated asset identifiers. The existing `extensionsModule.test.ts` asserts on the generated source.
- [Loading full translations for an uninstalled extension adds an i18next namespace the user never installed] → It's just strings: no code runs. Uninstall/reinstall already re-adds translations, so nothing conflicts.
- [A hosted screenshot link can go stale after publish] → It's handled like a broken icon: the image is left out, and nothing else fails.
- [Duplicated limits drift between the app and extension-scripts] → A parity unit test.

## Migration Plan

Nothing to migrate. Both fields are optional, and existing manifests and published sets behave the same.

Rollback means reverting the PR: the fields would be ignored again, and the build would no longer reject bad ones.
