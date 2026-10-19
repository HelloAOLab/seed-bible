# {{extensionId}}

A Seed Bible extension, scaffolded by `create-seed-bible-extension`.

## Commands

- `npm run check` — type-check with TypeScript.
- `npm run lint` — lint with ESLint.
- `npm run lint:fix` — lint with ESLint, automatically fixing what it can.
- `npm run test` — run the test suite with Vitest.
- `npm run dev` — run a real Seed Bible instance with this extension
  auto-installed. It runs the newest Seed Bible release matching the
  `seed-bible` version in `package.json`; raise that version to move to a
  newer one. The first run of each version clones and installs it into a local
  cache (this can take a few minutes); later runs reuse it. Pass
  `--seed-bible-version <version|branch>` (e.g. `develop`) to run a different
  one, or `--repo <path>` to use an existing seed-bible checkout.
- `npm run build` — validate and package this extension's source, ready to
  drop into a `seed-bible` checkout's `packages/<name>/` (the fully-supported
  distribution path).
- `npm run build:standalone` — additionally produce a single-file ES module
  for hosting outside the seed-bible monorepo. Seed Bible runs an extension
  loaded this way in a sandbox, behind permissions the user approves, so it
  must be written with `defineExtension()` from `seed-bible/sandbox` rather
  than `registerExtension()` — see the README generated alongside it
  (`dist/standalone/README.md`).
- `npm run publish` — build standalone, upload the bundle, and upload a small
  manifest (an `ExtensionSet`) describing it, then print that manifest's URL.
  Anyone can make this extension discoverable — listed, not yet installed —
  by calling `context.extensions.discoverExtensionSet(url)` with it. The
  first run prompts you to log in once (an email + the code it sends you) and
  prints a `SEED_BIBLE_RECORD_KEY` to save for non-interactive publishes
  after that (e.g. in CI) — treat it like a password. Pass `--dry-run` to see
  the manifest without uploading anything.

Replace `npm run` above with `pnpm run`/`yarn run` if you're using a
different package manager — every command here works the same way with any
of them.

## Learn more

See `docs/developer-guide.md` in the
[seed-bible repository](https://github.com/HelloAOLab/seed-bible) for the
full extension-authoring API: toolbar tools, verse tools, custom panes,
Discover providers, chat providers, and more. `src/init.tsx` in this project
demonstrates a few of them as a starting point.
