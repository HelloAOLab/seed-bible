# {{extensionId}}

A Seed Bible extension, scaffolded by `create-seed-bible-extension`.

## Commands

- `npm run check` — type-check with TypeScript.
- `npm run lint` — lint with ESLint.
- `npm run lint:fix` — lint with ESLint, automatically fixing what it can.
- `npm run test` — run the test suite with Vitest.
- `npm run dev` — run a real Seed Bible instance with this extension
  auto-installed. The first run clones and installs the seed-bible app into a
  local cache (this can take a few minutes); later runs reuse it. Pass
  `--repo <path>` to use an existing seed-bible checkout instead.
- `npm run build` — validate and package this extension's source, ready to
  drop into a `seed-bible` checkout's `packages/<name>/` (the fully-supported
  distribution path).
- `npm run build:standalone` — additionally produce a self-contained ES
  module for hosting outside the seed-bible monorepo. **Experimental** — see
  the README generated alongside it (`dist/standalone/README.md`) for what
  that means in practice.

Replace `npm run` above with `pnpm run`/`yarn run` if you're using a
different package manager — every command here works the same way with any
of them.

## Learn more

See `docs/developer-guide.md` in the
[seed-bible repository](https://github.com/HelloAOLab/seed-bible) for the
full extension-authoring API: toolbar tools, verse tools, custom panes,
Discover providers, chat providers, and more. `src/init.tsx` in this project
demonstrates a few of them as a starting point.
