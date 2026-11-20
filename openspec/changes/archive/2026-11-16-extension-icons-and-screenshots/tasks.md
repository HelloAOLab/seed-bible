## 1. Built-in manifests: icon and screenshots in the app build

- [x] 1.1 Add `icon?: string` and `screenshots?: { src: string; caption?: string }[]` to `ExtensionMetaFile` in `script/lib/extensionsModule.ts`. Make `trimMeta` keep `icon`, keep `screenshots`, and copy each caption key's English text into the inline English block. Verify with new `extensionsModule.test.ts` cases for a manifest with and without the fields.
- [x] 1.2 Change `generateEntryModuleSource` to emit one `import asset_N from "<importBase>/<file>?url"` per icon and screenshot file. The meta literal references those identifiers, and all other values still go through `toJsLiteral`; the SSR build does the same. Verify with tests asserting on the generated source, including a path that needs escaping.
- [x] 1.3 Add the validation constants (image types, 256 KB icon limit, 1 MB screenshot limit, at most 8 screenshots) and a `checkExtensionMedia(dir, meta)` in `script/lib`. It returns messages for a missing file, an unsupported type, an oversized file, too many entries, or a caption key with no English text. Verify with unit tests for each message using temp-dir fixtures.
- [x] 1.4 Call `checkExtensionMedia` from `vite-plugin-extensions.ts` and fail with `this.error` naming the extension. Watch each referenced image file in dev. Verify that `pnpm build` fails on a deliberately broken fixture manifest (an integration-style test of the plugin's `load`), and that the dev server reloads when an icon file is replaced.
- [x] 1.5 Wire up `packages/apologist-extension/icon-square.svg` as that extension's `icon`, as a real built-in example. Verify in `pnpm dev` that Settings → Extensions shows the Apologist icon instead of initials.

## 2. App runtime: manifest types, fetched sets and caption translations

- [x] 2.1 Add `screenshots?: { src: string; caption?: string }[]` to `ExtensionMeta`, with a doc comment matching `icon`'s. Verify with `pnpm check:ts`.
- [x] 2.2 Replace `withResolvedIcon` with `withResolvedMedia`, which resolves the icon and each screenshot `src` against the set URL, keeps only links that pass `isExtensionSetUrl`, and drops a malformed `screenshots` field. Verify with `ExtensionManager` tests (CasualOS/fetch mocked at the boundary) for a relative path, an `http:` link being dropped, and a malformed field leaving the extension installable.
- [x] 2.3 Add an `ExtensionManager` method that loads an extension's full translations without installing it, at most once per extension, and adds them to i18next. Verify with a test where an uninstalled built-in's Spanish caption becomes available after the call, and where calling it twice imports once.

## 3. Screenshot strip and viewer

- [x] 3.1 Add the app's own strings to `i18n/en.json` only: section heading, "{{current}} of {{total}}", previous, next, close, and "Screenshot {{n}}" for uncaptioned images. Verify with `pnpm lint` (the i18n key rule).
- [x] 3.2 Build `ScreenshotViewer` in `components/ScreenshotViewer/` and export it from `components/index.tsx`. Its behavior:
  - it renders through `PortalComponent` with `role="dialog"` and `aria-modal="true"`;
  - it shows the fitted image, the caption, the counter, and the previous/next/close controls;
  - previous and next are disabled at the ends, and hidden when there's only one screenshot;
  - the arrow keys work and are mirrored in right-to-left languages;
  - Escape and a backdrop click close it;
  - a swipe counts when it travels over 40 px horizontally;
  - focus is trapped while open and restored on close.

  Style it with `--sb-*` tokens only. Verify with component tests for each behavior in the "Full-size screenshot viewer" requirement, and with `pnpm lint` (stylelint tokens).

- [x] 3.3 Add the screenshot strip to the About tab of `ExtensionInfoPage.tsx`. Its behavior:
  - lazy thumbnails at a shared height that keep their aspect ratio;
  - a thumbnail that fails to load is dropped from the strip and the viewer;
  - captions are the accessible names;
  - on open, it calls the translation loader from 2.3 when the language isn't English and a caption exists.

  Verify with tests for an uninstalled built-in showing captions, the English fallback, a failed image being dropped (counter "1 of 2"), and no section when there are no screenshots.

- [ ] 3.4 Check the page by hand in `pnpm dev`, in both the narrow (sidebar) and wide layouts, on a phone-width viewport and with an RTL language, using an extension given temporary screenshots. Verify by recording what was checked in the PR's test plan.

## 4. seed-bible-extension-scripts

- [x] 4.1 Generalize `lib/icon.ts` into `lib/images.ts`, with checking and reading for both the icon and screenshots. Add `screenshots` to `ExtensionProjectMeta`. Make `check` report screenshot problems and exit 1. Verify with updated `icon.test.ts` (renamed `images.test.ts`) cases mirroring 1.3's messages.
- [x] 4.2 Make `dev` serve `/screenshots/<index><ext>` and put those links in the set it serves. Verify with a `devExtensionServer.test.ts` case that fetches a screenshot and checks the served set.
- [x] 4.3 Make `package` write `screenshot-<hash><ext>` files and point the manifest at `./screenshot-<hash><ext>`, keeping captions and order. Add the files to the cache rules next to `icon-*`. Verify with `sitePackage.test.ts` cases.
- [x] 4.4 Make `publish` upload each screenshot file and replace its `src` with the uploaded link, leaving `https:` links unchanged. Make `--dry-run` mention the screenshots. Verify with `publish.test.ts` cases (records client mocked).
- [x] 4.5 Add a parity test that fails if the app build's media limits (1.3) and `lib/images.ts`'s limits differ. Verify by changing one limit locally, confirming the test fails, and restoring it.
- [x] 4.6 Add an icon and two screenshots to `packages/sandboxed-example-extension`, so the reference template shows the format. Verify with `seed-bible-extension-scripts check` on that package exiting 0.

## 5. Docs and final checks

- [x] 5.1 Document `icon` and `screenshots` for built-in extensions in `docs/developer-guide.md`, and screenshots in its link-installed manifest section. Cover the format, limits, captions as translation keys, and recommended sizes. Verify by reading the rendered Markdown.
- [x] 5.2 Document screenshots in `packages/seed-bible-extension-scripts/README.md`, covering the `check`, `package` output files and `publish` behavior. Verify by reading the rendered Markdown.
- [x] 5.3 Run `pnpm check:ts`, `pnpm lint` and `pnpm test` on Node 24, and `pnpm build`, and verify that all pass.
