## Why

When someone browses extensions in Seed Bible, all they see is a name, a short description and, for most extensions, colored initials. Built-in extensions can't set an icon at all, because the build drops the field. No extension can show what it looks like in use. Seeing an extension in action is the quickest way to decide whether to install it, and Bible Atlas is about to ship as a built-in extension that is mostly visual (maps, family trees, timelines).

## What Changes

- Built-in extensions (`packages/*-extension/`) can name an `icon` image file in `extension.json`. The app build bundles the file and shows it wherever the extension is listed, the same way link-installed extensions already do. Today the build silently drops the field.
- Every extension, built-in or installed from a link, can list `screenshots` in `extension.json`. Each one is an image file plus an optional caption, and the caption is a translation key so it can be translated like the title and description.
- The extension's page (Settings → Extensions → an extension, About tab) shows the screenshots as a horizontal strip of thumbnails. Selecting one opens a full-size viewer with previous/next buttons, arrow keys, swiping, the caption, a "2 of 5" counter and a close button.
- `seed-bible-extension-scripts` handles screenshots the same way it handles the icon:
  - `check` validates them.
  - `dev` serves them.
  - `package` copies them next to the bundle under names based on their contents.
  - `publish` uploads each one and puts its link in the manifest.
- A built-in extension whose `icon` or `screenshots` name a missing, oversized or unsupported file fails the app build with a message saying which file and why.
- Docs: the developer guide and the extension-scripts README describe both fields.

No breaking changes. Both fields are optional, and manifests without them behave as they do today.

## Capabilities

### New Capabilities

- `extension-icon`: an extension's icon. This covers how built-in and link-installed extensions declare it, where it's shown, and the fallback to initials.
- `extension-screenshots`: an extension's screenshots. This covers how they're declared and validated, the strip on the extension's page and the full-size viewer.

### Modified Capabilities

None. There are no existing specs in `openspec/specs/`.

## Impact

- **App build**: `script/lib/extensionsModule.ts` (manifest type, `trimMeta`, generated entry module) and `script/lib/vite-plugin-extensions.ts` (validation and file watching).
- **App runtime**:
  - `managers/ExtensionManager.tsx`: `ExtensionMeta` type, validating a fetched set, resolving links against the set's URL, and loading caption translations for an extension that isn't installed.
  - `components/SettingsPage/ExtensionInfoPage.tsx`: the screenshot strip.
  - A new screenshot viewer component.
  - `i18n/en.json` for the viewer's own labels.
- **Extension tooling**: `packages/seed-bible-extension-scripts`, specifically `lib/icon.ts` (generalized to images), `project.ts`, `devExtensionServer.ts`, `sitePackage.ts`, `commands/check.ts`, `commands/package.ts` and `commands/publish.ts`.
- **Docs**: `docs/developer-guide.md` and `packages/seed-bible-extension-scripts/README.md`.
- **Tests**: `test/unit/script/lib/extensionsModule.test.ts`, `test/unit/seed-bible-extension-scripts/*`, plus new tests for the info page strip and the viewer.
- **No new dependencies.**
- **Follow-up, not part of this change**: Bible Atlas (PR #1796) adds its own icon and screenshots once this lands.
