# SSR Host Server

The server in this directory renders Seed Bible's HTML. It has two distinct modes
selected by `NODE_ENV`:

- **production** ([index.ts](index.ts) → `startProdServer`): a single
  long-running, multi-branch host. It serves every branch's deployment from
  pre-built artifacts resolved through an [artifact store](store.ts). Per
  request it resolves the branch's live build, then either server-side renders
  it or returns its pre-rendered HTML (see [SSR whitelisting](#ssr-whitelisting)).
- **development** (`startDevServer`): an Express + Vite middleware server with
  HMR. The SSR entry is loaded fresh from source on every request via
  `vite.ssrLoadModule`, so there is no build step. None of the production host
  code runs in this mode.

## Running

```bash
# Development (Vite + HMR), no build required
pnpm dev                       # → bun server/index.ts

# Production build, then run
pnpm build                     # builds client, SSR bundle, and server/dist/index.js
NODE_ENV=production bun run server/dist/index.js
```

## Routes (production)

| Route                                             | Behaviour                                          |
| ------------------------------------------------- | -------------------------------------------------- |
| `GET /`                                           | The root branch (`ROOT_BRANCH`).                   |
| `GET /?pattern=<branch>`                          | That branch's live deployment.                     |
| `GET /?pattern=<branch>&patternVersion=<buildId>` | A pinned build (skips the pointer lookup).         |
| `GET /healthz`                                    | Liveness probe (returns `ok`).                     |
| `POST /__invalidate?branch=<branch>`              | Drops the cached pointer + modules for one branch. |
| `POST /__invalidate`                              | Drops every cached pointer.                        |

Hashed assets are **not** served here — rendered HTML references them at the
absolute `ASSET_HOST` (CDN/S3).

## Configuration

All configuration is via environment variables. Defaults are applied at startup.

### Server

| Variable           | Default   | Description                                                                                     |
| ------------------ | --------- | ----------------------------------------------------------------------------------------------- |
| `NODE_ENV`         | _(unset)_ | `production` selects the multi-branch host; anything else runs the Vite dev server.             |
| `PORT`             | `3002`    | Port the server listens on.                                                                     |
| `ROOT_BRANCH`      | `main`    | Branch served for `GET /` (no `pattern`). Also the default value of `ALLOWED_SSR_BRANCHES`.     |
| `ASSET_HOST`       | `""`      | Absolute host prepended to hashed asset URLs in rendered HTML (e.g. `https://cdn.example.com`). |
| `POINTER_TTL_MS`   | `10000`   | How long (ms) a branch → buildId pointer is cached before re-reading from the store.            |
| `MODULE_CACHE_MAX` | `20`      | Max entries in each LRU cache (loaded SSR modules, and pre-rendered HTML for non-SSR branches). |

### SSR whitelisting

For security, only **trusted** branches have their SSR bundle imported and
executed. Other branches still work — their bundle is just never downloaded or
imported.

| Variable               | Default       | Description                                                                         |
| ---------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `ALLOWED_SSR_BRANCHES` | `ROOT_BRANCH` | Comma-separated branches rendered by **their own** SSR bundle. e.g. `main,staging`. |
| `DEFAULT_SSR_BRANCH`   | `""`          | Optional trusted branch used to render any **non-whitelisted** branch. See below.   |

How a request for branch `B` is handled:

1. **`B` is in `ALLOWED_SSR_BRANCHES`** → load `B`'s SSR bundle and render its
   own pre-rendered HTML.
2. **`B` is not whitelisted, and `DEFAULT_SSR_BRANCH` is set** → fetch only
   `B`'s pre-rendered HTML, then render it through `DEFAULT_SSR_BRANCH`'s
   bundle. `B`'s own bundle is never imported, so none of its code runs. (If
   `DEFAULT_SSR_BRANCH` has no live deployment, this falls back to step 3 and
   logs a warning.)
3. **Otherwise** → return `B`'s pre-rendered HTML verbatim. No SSR module is
   imported and no build code runs.

> Note: `DEFAULT_SSR_BRANCH`'s render logic runs against another branch's
> pre-rendered HTML, so it must be compatible with the HTML shape those branches
> produce.

### Store

The store ([store.ts](store.ts)) resolves branch pointers and artifacts. The
backend is selected by `STORE_BACKEND`; when unset it defaults to `local` in
production and `dev` otherwise.

| Variable        | Default                                     | Description                                                         |
| --------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `STORE_BACKEND` | `local` (prod) / `dev` (non-prod)           | One of `s3`, `local`, `dev`.                                        |
| `S3_BUCKET`     | _(none)_                                    | **Required** when `STORE_BACKEND=s3`. Bucket holding the artifacts. |
| `STORE_DIR`     | `dist/.deploy-store` (local) / `dist` (dev) | Root directory for the `local` and `dev` backends.                  |

**Backends:**

- **`s3`** — production. Reads pointers and artifacts from an S3 bucket. The AWS
  SDK (`@aws-sdk/client-s3`) is imported lazily, so it is only needed for this
  backend. Standard AWS credential resolution applies.
- **`local`** — reads the same layout from a directory on disk (CI smoke tests,
  local production runs).
- **`dev`** — serves the local Vite build output directly (`dist/client`,
  `dist/server`); used implicitly by `pnpm dev`.

**Artifact layout** (shared by the `s3` and `local` backends):

```
branches/<name>/current.json            → { "buildId": "<id>", "commit": "...", "deployedAt": "..." }
branches/<name>/<buildId>/server.mjs    → SSR bundle (exports render())
branches/<name>/<buildId>/index.html    → pre-rendered HTML
```

## Example configurations

Production host on S3, SSR'ing only `main` and `staging`, rendering all other
branches (e.g. preview deploys) through `main`'s bundle:

```bash
NODE_ENV=production \
STORE_BACKEND=s3 \
S3_BUCKET=seed-bible-artifacts \
ASSET_HOST=https://cdn.seedbible.example \
ALLOWED_SSR_BRANCHES=main,staging \
DEFAULT_SSR_BRANCH=main \
node server/dist/index.js
```

Local production-mode run against an on-disk store (smoke testing a build):

```bash
NODE_ENV=production \
STORE_BACKEND=local \
STORE_DIR=./dist/.deploy-store \
node server/dist/index.js
```
