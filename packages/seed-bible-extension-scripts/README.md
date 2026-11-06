# seed-bible-extension-scripts

The toolkit behind a Seed Bible extension project: it checks, tests,
builds, runs and ships the extension. Projects made with
[`create-seed-bible-extension`](https://github.com/HelloAOLab/seed-bible/tree/develop/packages/create-seed-bible-extension/) already
depend on it and call it from their `package.json` scripts, so most of the
time you run `npm run dev` or `npm run package` rather than these commands
directly.

```bash
npm install --save-dev seed-bible-extension-scripts
npx seed-bible-extension-scripts --help
```

Every command runs from the root of an extension project: the folder with
`extension.json` in it.

## Two kinds of extension

What the commands do depends on how the extension is written, which they
work out from its code:

- **Sandboxed** (the default for new projects): the code imports
  `seed-bible/extensions` and exports `defineExtension(...)`. Seed Bible
  runs it in an isolated frame, loaded from a link, with only the
  permissions the user approved. This is how a third party ships an
  extension.
- **Built in**: the code calls `registerExtension(...)` from `seed-bible`.
  It runs inside the app with full access, so it only ships by being added
  to the [seed-bible repository](https://github.com/HelloAOLab/seed-bible)
  under `packages/`.

The rest of this README is about sandboxed extensions unless it says
otherwise. For writing one, see
[`docs/developer-guide.md`](https://github.com/HelloAOLab/seed-bible/blob/develop/docs/developer-guide.md),
and [`docs/extension-api.md`](https://github.com/HelloAOLab/seed-bible/blob/develop/docs/extension-api.md)
for every `sb` call.

## Commands

### `check`

Type-checks the project with its own `tsconfig.json`, then checks
`extension.json`:

- Every permission is one Seed Bible knows, and none that can only be
  optional (such as `highlights:write`) is listed under `permissions`.
- The code doesn't use an `sb.*` feature whose permission isn't declared.
  For example, calling `sb.highlights.add` without `highlights:write` is an
  error, because Seed Bible would refuse it every time.
- As a warning, every declared permission is used somewhere. Unused ones
  only make the install prompt longer.
- The `icon`, if there is one, is a `.png`, `.svg`, `.webp` or `.jpg` in
  the project under 256 KB, or an `https:` link.

It reads the code as text, so it can't see a call made some roundabout way.
Exits non-zero on an error.

### `lint`

Lints with the project's own `eslint.config.mts`. `--fix` fixes what it
can.

### `test`

Runs the project's tests with Vitest. Extra arguments go to Vitest
(`npm run test -- --watch`). A project with no tests passes.

Use `createTestHost` from `seed-bible/extensions/testing` to run the
extension against a stand-in for Seed Bible; the scaffolded
`src/init.test.tsx` shows how.

### `build`

Runs `check` and `test`, then writes `dist/standalone/index.js`: one ES
module with everything the extension imports bundled in. It holds one copy
of Preact, the project's own, even if `seed-bible` depends on another
version.

For a built-in extension it writes `dist/monorepo-package/` instead: the
checked source, ready to copy into `packages/<name>/` in a seed-bible
checkout. `--standalone` makes the bundle required, which is an error for a
built-in extension.

### `package`

Runs `build`, then writes `dist/site/`: everything needed to install the
extension, as plain files for any static host. See
[Hosting it yourself](#hosting-it-yourself).

| File                 | What it's for                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| `<id>-<hash>.js`     | The bundle, named after its contents, so it can be cached forever.                                       |
| `icon-<hash>.<ext>`  | The `icon` from `extension.json`, if it has one, also named after its contents.                          |
| `extension-set.json` | The link Seed Bible installs from. It points at the bundle by file name and pins its hash (`integrity`). |
| `index.html`         | An install page with an **Install in Seed Bible** button. It works out the link from its own address.    |
| `_headers`           | Lets Seed Bible fetch the files from Cloudflare (Pages and Workers) and Netlify.                         |
| `.nojekyll`          | Makes GitHub Pages serve the folder as it is.                                                            |

`--app-url <url>` points the install button at another Seed Bible (the
default is `https://seedbible.org/`).

### `publish`

Builds the extension and uploads it to Seed Bible's own storage, so you
don't need a host at all. It prints the extension's link and a ready-made
install link.

The link stays the same every time you publish: the bundle is uploaded as a
new file, and the manifest the link points to is overwritten to name it.
The `icon` from `extension.json`, if it has one, is uploaded too, to a link
of its own that the manifest names. So
to release an update, bump `version` in `extension.json` and run `publish`
again. People who installed it get the new version the next time they open
Seed Bible. Each extension has its own link, so publishing one never
replaces another.

The first run asks for your Seed Bible account's email and the code it
sends you, then prints a `SEED_BIBLE_RECORD_KEY`. Save it as an
environment variable (for example a CI secret) and later runs won't ask
again. Treat it like a password: anyone with it can publish under your
account. `--dry-run` prints the manifest without uploading anything.

### `dev`

Runs a real Seed Bible on your machine and offers to install the extension
in it. For a sandboxed extension it:

1. builds the bundle, and rebuilds it every time you save;
2. serves it at `http://localhost:5174/extension-set.json`, always
   describing the latest build;
3. starts Seed Bible's dev server on `http://localhost:3002` and opens a
   link that shows the install dialog.

Approve it once. After that, reload the page to run your latest code. If
you add a permission to `extension.json`, the reload shows the update
prompt, as a real update would.

Which Seed Bible it runs:

- By default, the newest release matching the `seed-bible` version in
  `package.json`. Each release is cloned and installed into a cache the
  first time (a few minutes), then reused. The cache is under
  `$XDG_CACHE_HOME`, `%LOCALAPPDATA%` or `~/.cache`, in
  `seed-bible-extension-dev/`.
- A `link:` or `file:` dependency on a local seed-bible checkout runs that
  checkout.
- `--seed-bible-version <range|branch>` picks another one for this run, for
  example `--seed-bible-version develop`.
- `--repo <path>` uses an existing checkout as it is.

`--port` changes Seed Bible's port and `--extension-port` the extension's.
For a built-in extension, `dev` instead adds it to the app's own build,
with hot reloading.

## Hosting it yourself

`package` makes a folder you can put on any static host. These are the
three a new project is set up for.

### GitHub Pages

1. Push the project to a GitHub repository.
2. In the repository, open **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Push to `main` (or run the workflow from the **Actions** tab). The
   included `.github/workflows/deploy-pages.yml` runs `npm run package` and
   publishes `dist/site/`.

The install page is then at `https://<user>.github.io/<repository>/`, and
the link to share is `https://<user>.github.io/<repository>/extension-set.json`.
Every push to `main` publishes a new version.

GitHub Pages already lets other sites fetch its files, so nothing else is
needed. It caches files for about 10 minutes, so an update can take that
long to reach people.

### Cloudflare Pages

```bash
npm run deploy:cloudflare-pages
```

This runs `package`, then `wrangler pages deploy dist/site`. The first time,
Wrangler opens a browser to log in to Cloudflare, and offers to create a
Pages project named after the extension. The output ends with the address, such
as `https://<id>.pages.dev/`. Run it again to publish an update.

To deploy from CI instead, set `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` and run the same command.

### Cloudflare Workers

```bash
npm run deploy:cloudflare-workers
```

This runs `package`, then `wrangler deploy`, which serves `dist/site/` as
static files using the project's `wrangler.jsonc`. As with Pages, the first
run logs you in, and the output ends with the address (such as
`https://<id>.<your-subdomain>.workers.dev/`).

### Anywhere else

Upload the contents of `dist/site/` as they are: Netlify, an S3 bucket, your
own server. Two things matter:

- **Other sites must be allowed to fetch the files.** Seed Bible fetches
  them from its own page, so the host must send
  `Access-Control-Allow-Origin: *` with `extension-set.json` and the
  bundle. `_headers` does this on Netlify.
- **HTTPS.** Seed Bible only installs from `https://` links (and from
  `localhost` while developing).

### After you deploy

1. Open the install page and click **Install in Seed Bible**. You should
   see the consent dialog, naming your host.
2. If nothing happens, open the browser's developer tools on the Seed Bible
   tab and look at the console and network requests.

To release an update, bump `version` in `extension.json`, then deploy
again. People who installed it get the new version the next time they open
Seed Bible. They're only asked again if it needs a permission they haven't
already allowed.

## Troubleshooting

- **"Couldn't find any extensions at that link"**, or nothing happens:
  check that `<your address>/extension-set.json` opens in a browser, that
  it's `https://`, and that the response includes
  `Access-Control-Allow-Origin: *`. Missing CORS is the usual cause on a
  host other than the three above.
- **"The bundle doesn't match the integrity hash"**: the host served an old
  `extension-set.json` with a new bundle, or the other way round, usually
  because of a cache. Wait for the cache to expire (GitHub Pages: about 10
  minutes), or redeploy. `package` names each bundle after its contents, so
  this only happens if the folder was edited by hand or uploaded partly.
- **`check` reports a permission the code uses**: add it to
  `optionalPermissions` (and ask for it with `sb.permissions.request` when
  the feature is used), or to `permissions` if the extension can't work
  without it.
- **A pane stays blank**: the view threw while loading or rendering. Seed
  Bible logs it in the console as "Extension '<id>' view failed".
- **`dev` says the Seed Bible version is too old**: raise `seed-bible` in
  `package.json`, or run `dev --seed-bible-version develop`.

## Environment variables

| Variable                | Used by   | What it does                                                                                                                               |
| ----------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `SEED_BIBLE_RECORD_KEY` | `publish` | Publishes without logging in. Printed by the first `publish`.                                                                              |
| `SEED_BIBLE_ENDPOINT`   | `publish` | Publishes to another Seed Bible records server, for testing. Requests still come from `https://auth.ao.bot`, so that server must allow it. |
| `XDG_CACHE_HOME`        | `dev`     | Where Seed Bible checkouts are cached (`%LOCALAPPDATA%` on Windows).                                                                       |

## Working on this package

It lives in the seed-bible repository, at
`packages/seed-bible-extension-scripts/`. `pnpm build` compiles it to
`dist/`. Its tests are with the repository's, in
`test/unit/seed-bible-extension-scripts/`, and run with `pnpm test` from the
repository root.
