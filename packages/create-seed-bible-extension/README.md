# create-seed-bible-extension

Creates a new [Seed Bible](https://seedbible.org) extension project, ready
to run, test and publish.

```bash
npm create seed-bible-extension@latest verse-art
# or
pnpm create seed-bible-extension verse-art
# or
npx create-seed-bible-extension@latest verse-art
```

Then:

```bash
cd verse-art
npm install
npm run dev
```

`npm run dev` starts Seed Bible on your machine and offers to install the
new extension in it. Approve it, and a star button named after the
extension appears in the reader's toolbar. Edit `src/init.tsx`, save, and reload the page to see the change.

## Usage

```
create-seed-bible-extension <name> [directory]
```

- `<name>` becomes the extension's id, lowercased with hyphens
  (`"Verse Art"` becomes `verse-art`), and the package name.
- `[directory]` is where to create it. It defaults to `<name>`, and must
  not exist yet.

You need Node.js 22 or newer.

## What you get

A sandboxed extension: Seed Bible runs it in its own isolated frame, and it
reaches the app only through the `sb` object, with only the permissions the
user approves when installing it.

```
verse-art/
├── extension.json          id, version, permissions, translations
├── index.ts                the entry point; re-exports src/init.tsx
├── src/
│   ├── init.tsx            the extension: a toolbar button that opens a pane
│   └── init.test.tsx       its tests, using createTestHost
├── .github/workflows/
│   └── deploy-pages.yml    publishes to GitHub Pages on every push to main
├── wrangler.jsonc          for hosting on Cloudflare Workers
├── package.json            scripts that call seed-bible-extension-scripts
├── tsconfig.json, eslint.config.mts, vitest.config.ts, .prettierrc.json
├── eslint-rules/           translation checks for extension.json
└── README.md               the commands, hosting, and permissions
```

The starting extension shows the usual pieces:

- a toolbar button (`sb.tools.registerToolbarTool`);
- a pane with its own view (`sb.panes.open` and `views`);
- asking for an optional permission (`reading:position`) when the button is
  clicked, and still working if the user says no;
- the extension's own storage (`sb.storage`) and translations
  (`sb.i18n.t`, from `extension.json`).

## Scripts in the new project

| Script                              | What it does                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`                       | Runs Seed Bible locally with the extension, rebuilding as you save.            |
| `npm run check`                     | Type-checks, and checks `extension.json`'s permissions against the code.       |
| `npm run lint` / `lint:fix`         | Lints with ESLint.                                                             |
| `npm run test`                      | Runs the tests with Vitest.                                                    |
| `npm run build`                     | Checks, tests, and builds `dist/standalone/index.js`.                          |
| `npm run package`                   | Builds `dist/site/`: files to upload to any static host, with an install page. |
| `npm run deploy:cloudflare-pages`   | Packages and deploys to Cloudflare Pages.                                      |
| `npm run deploy:cloudflare-workers` | Packages and deploys to Cloudflare Workers.                                    |
| `npm run publish`                   | Builds and uploads to Seed Bible's own storage, with no host needed.           |

The scripts come from
[`seed-bible-extension-scripts`](https://github.com/HelloAOLab/seed-bible/tree/develop/packages/seed-bible-extension-scripts/), whose
README covers each command, how to host on GitHub Pages, Cloudflare or
elsewhere, and what to do when an install fails.

## Learn more

- [`docs/extension-api.md`](https://github.com/HelloAOLab/seed-bible/blob/develop/docs/extension-api.md): the
  reference for every `sb` call, `extension.json` field, error, limit and
  testing helper.
- §7 of [`docs/developer-guide.md`](https://github.com/HelloAOLab/seed-bible/blob/develop/docs/developer-guide.md): a
  tour of the same API by example.
- [`docs/extension-security.md`](https://github.com/HelloAOLab/seed-bible/blob/develop/docs/extension-security.md): how the
  sandbox keeps users safe.
- [`packages/sandboxed-example-extension`](https://github.com/HelloAOLab/seed-bible/tree/develop/packages/sandboxed-example-extension/):
  a fuller example, with Discover results, settings, a sensitive request
  and CasualOS portals.

## Working on this package

It lives in the seed-bible repository, at
`packages/create-seed-bible-extension/`. The files it copies are in
`templates/extension/`. Files ending in `.tpl` have `{{extensionId}}`,
`{{packageName}}`, `{{extensionPascalName}}`, `{{scriptsVersion}}` and
`{{seedBibleVersion}}` filled in, and lose the `.tpl`. `pnpm build` compiles it to `dist/`. The test in
`test/unit/create-seed-bible-extension/` scaffolds a project and runs that
project's own tests, so a template change that breaks a new project fails
there.
