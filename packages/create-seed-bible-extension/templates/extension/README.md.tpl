# {{extensionId}}

A Seed Bible extension, scaffolded by `create-seed-bible-extension`.

It's a **sandboxed** extension: Seed Bible runs it in its own iframe,
isolated from the app, and it reaches the app only through the `sb` object
in `src/init.tsx`. Every call is checked against the permissions in
`extension.json`, which the user approves when they install it.

## Commands

- `npm run dev`: builds the extension, serves it locally, and runs a real
  Seed Bible that offers to install it. Changes are rebuilt as you save;
  reload the page to pick them up. It runs the newest Seed Bible release
  matching the `seed-bible` version in `package.json`. The first run of each
  version clones and installs it into a local cache (this can take a few
  minutes); later runs reuse it. Pass `--seed-bible-version <version|branch>`
  (e.g. `develop`) to run a different one, or `--repo <path>` to use an
  existing seed-bible checkout.
- `npm run check`: type-checks the code, and checks `extension.json`: that
  Seed Bible would install it, that it declares every permission the code
  uses, and (as warnings) that it doesn't ask for any it doesn't use.
- `npm run lint` / `npm run lint:fix`: lint with ESLint.
- `npm run test`: runs the tests with Vitest. `src/init.test.tsx` shows how
  to use `createTestHost` from `seed-bible/extensions/testing`, which runs
  the extension against a stand-in for Seed Bible.
- `npm run build`: checks, tests, and builds the single-file bundle Seed
  Bible loads, in `dist/standalone/`.
- `npm run package`: checks, tests, builds, and writes `dist/site/`: the
  files to host yourself (see "Hosting it" below).
- `npm run publish`: builds, uploads the bundle and a small manifest
  describing it (an `ExtensionSet`), and prints that manifest's link. Anyone
  can paste the link into Seed Bible's Settings > Extensions > "Add
  extensions from a link" to install it. The first run prompts you to log in
  once (an email and the code it sends you) and prints a
  `SEED_BIBLE_RECORD_KEY` to save for non-interactive publishes after that
  (e.g. in CI); treat it like a password. Pass `--dry-run` to see the
  manifest without uploading anything.

Replace `npm run` with `pnpm run` or `yarn run` if you use a different
package manager; every command works the same way with any of them.

## Hosting it

`npm run package` writes `dist/site/`, a folder of static files that works
from any static host, at any address:

- the bundle, named by its hash, so browsers can cache it for good;
- `extension-set.json`, the link Seed Bible installs from;
- `index.html`, a page with an "Install in Seed Bible" button;
- `_headers` and `.nojekyll`, so each host serves the files the way Seed
  Bible needs.

Then pick a host:

- **GitHub Pages**: push this project to GitHub, and in the repository's
  Settings > Pages set "Source" to "GitHub Actions". The workflow in
  `.github/workflows/deploy-pages.yml` packages and publishes the extension
  on every push to `main`, at `https://<user>.github.io/<repository>/`.
- **Cloudflare Pages**: `npm run deploy:cloudflare-pages`. The first run asks
  you to log in to Cloudflare and creates a project named after the
  extension.
- **Cloudflare Workers**: `npm run deploy:cloudflare-workers`, which uses
  `wrangler.jsonc`.
- **Anywhere else**: upload `dist/site/` as it is. The host has to let other
  sites fetch the files (send `Access-Control-Allow-Origin: *`); `_headers`
  takes care of that on Cloudflare and Netlify, and GitHub Pages does it
  already.

Share the hosted page, or its `extension-set.json` link. People who
installed the extension get each new upload the next time they open Seed
Bible.

## Permissions

List what the extension can't work without under `permissions`, and what
only some features need under `optionalPermissions`, then ask for those with
`sb.permissions.request(...)` when the feature is used. Some permissions,
such as writing the user's highlights, can only ever be optional. `npm run
check` tells you if one is in the wrong list. List every host the extension
contacts under `network`.

Bump `version` in `extension.json` when you publish a new release. Users
are asked again only if a new version needs more than they already allowed.

## Learn more

See §7 of `docs/developer-guide.md` in the
[seed-bible repository](https://github.com/HelloAOLab/seed-bible) for the
whole `sb` API, and `docs/extension-security.md` for how the sandbox works.
