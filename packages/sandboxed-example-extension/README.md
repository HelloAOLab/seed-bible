# Sandboxed example extension

`seed-bible-refresh-example-extension`, ported to the sandbox: the same
tools, pane, Discover provider, settings, sensitive request and CasualOS
portals, written with `defineExtension` from `seed-bible/extensions`. It's a
working reference for third-party developers, and proof that the sandboxed
API covers a real extension. Comments in `src/main.tsx` point out where it has
to differ from the original.

It's set up like a project made with `create-seed-bible-extension`, except
that it depends on this repository's own packages. It isn't bundled into the
app: `script/lib/vite-plugin-extensions.ts` skips sandboxed extensions, which
only ever run loaded from a URL.

- `pnpm dev`: runs this checkout's Seed Bible and offers to install the
  extension, rebuilding it as you save. Build the packages it uses first
  (`pnpm build:seed-bible-package` and `pnpm build:extension-tools` from the
  repository root).
- `pnpm check` / `pnpm build` / `pnpm publish`: as for any extension.

Its tests live with the repository's, in
`test/unit/sandboxed-example-extension/`, and use `createTestHost` from
`seed-bible/extensions/testing`.

The one thing it can't port is the original's export (`return { abc }`):
a sandboxed extension can't share functions with other extensions.
