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

Hashed assets are **not** served here. Each deployment's chunks are namespaced
per branch/build (`branches/<name>/<buildId>/assets/...`) and referenced at the
absolute asset host, so the client loads them straight from the CDN. The asset
proxy only backstops same-origin requests for root-scoped files such as the PWA
shell (`sw.js`, `registerSW.js`, `manifest.webmanifest`), which are produced by
the `main` build and live at the bucket root; for that, point `ASSET_HOST` at
the bucket/CDN root.

## Configuration

All configuration is via environment variables. Defaults are applied at startup.

### Server

| Variable              | Default   | Description                                                                                                                           |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`            | _(unset)_ | `production` selects the multi-branch host; anything else runs the Vite dev server.                                                   |
| `PORT`                | `3002`    | Port the server listens on.                                                                                                           |
| `ROOT_BRANCH`         | `main`    | Branch served for `GET /` (no `pattern`). Also the default value of `ALLOWED_SSR_BRANCHES`.                                           |
| `ASSET_HOST`          | `""`      | Absolute host prepended to hashed asset URLs in rendered HTML (e.g. `https://cdn.example.com`).                                       |
| `POINTER_TTL_MS`      | `10000`   | How long (ms) a branch → buildId pointer is cached before re-reading from the store.                                                  |
| `MODULE_CACHE_MAX`    | `20`      | Max entries in each LRU cache (loaded SSR modules, and pre-rendered HTML for non-SSR branches).                                       |
| `INVALIDATION_SECRET` | `""`      | Shared secret required in the `x-invalidation-secret` header on `POST /__invalidate`. **When empty the endpoint is unauthenticated.** |
| `SHUTDOWN_GRACE_MS`   | `5000`    | How long to wait for in-flight requests on `SIGTERM`/`SIGINT` before flushing telemetry and exiting.                                  |

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
branches/<name>/<buildId>/assets/...    → this build's content-hashed chunks
sw.js, registerSW.js, manifest.webmanifest → root-scoped PWA shell (main build only)
```

### Telemetry (OpenTelemetry)

The server emits **traces and metrics** over OTLP. It is **off unless
`OTEL_EXPORTER_OTLP_ENDPOINT` is set** — with no endpoint configured nothing is
registered and no spans are allocated, so local development is unaffected.

| Variable                              | Default          | Description                                                                         |
| ------------------------------------- | ---------------- | ----------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`         | _(unset)_        | **Enables telemetry.** Base OTLP/HTTP URL, e.g. `http://collector:4318`.            |
| `OTEL_EXPORTER_OTLP_HEADERS`          | _(unset)_        | Extra headers for the exporter, e.g. `x-api-key=…`. Used for backend auth.          |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`  | _(derived)_      | Overrides the traces endpoint only.                                                 |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | _(derived)_      | Overrides the metrics endpoint only.                                                |
| `OTEL_SERVICE_NAME`                   | `seed-bible-ssr` | `service.name` reported on every span and metric.                                   |
| `OTEL_RESOURCE_ATTRIBUTES`            | _(unset)_        | Extra resource attributes, e.g. `deployment.environment.name=staging`.              |
| `OTEL_TRACES_SAMPLER`                 | parent-based     | Standard sampler selection, e.g. `parentbased_traceidratio`.                        |
| `OTEL_TRACES_SAMPLER_ARG`             | _(unset)_        | Sampler argument, e.g. `0.1` for 10% of traces.                                     |
| `OTEL_METRIC_EXPORT_INTERVAL`         | `60000`          | Metric push interval (ms).                                                          |
| `OTEL_SDK_DISABLED`                   | `false`          | Hard off switch, even when an endpoint is set.                                      |
| `OTEL_DEBUG_CONSOLE`                  | `false`          | Also print spans to stdout — lets you check span shape without running a collector. |

**Spans.** Each request produces a `SERVER` span named `<METHOD> <route>`, where
the route is a bounded label (`/`, `/healthz`, `/__invalidate`, `/b/:branch`,
`/b/:branch/:buildId`, `asset-proxy`). Nested under it, as applicable:
`store.readPointer`, `store.fetchArtifacts`, `store.fetchHtml`, `build.import`
(evaluating a branch's SSR bundle — the cold-start cost), `ssr.render`, and
`asset.proxy`. An inbound `traceparent` header is honoured, so a trace started
by a CDN or load balancer continues here. `GET /healthz` is deliberately **not**
traced: it fires constantly and would drown out real traffic.

**Metrics.** `http.server.request.duration`, `seedbible.ssr.render.duration`,
`seedbible.ssr.render.failures`, `seedbible.cache.lookups` (pointer/module/HTML,
hit vs miss), `seedbible.store.operation.duration`,
`seedbible.asset_proxy.duration`, and `seedbible.process.memory`.

**Watch `seedbible.ssr.render.failures`.** When `render()` throws, the server
logs it and serves the un-rendered HTML with a **200 OK** — so from the outside
the site looks healthy while visitors get a page with no server-rendered
content. Those requests carry `seedbible.ssr.degraded=true` on the request span.
This counter is the only cheap alarm for that state.

**Cardinality note.** Metric attributes use a clamped branch label: branches in
`ALLOWED_SSR_BRANCHES` appear by name, everything else collapses to `other`.
Any branch can be deployed and requested, so the raw name would be unbounded
cardinality. Spans are not aggregated and keep the real branch name.

**Why it is instrumented by hand.** Production runs under Bun from a single
pre-bundled file. `@opentelemetry/auto-instrumentations-node` works by patching
modules as they load, which Bun does not support and a pre-bundled file leaves
no opportunity for — so it would silently produce nothing. Every span is created
explicitly in [telemetry.ts](telemetry.ts) instead.

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
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
OTEL_SERVICE_NAME=seed-bible-ssr \
node server/dist/index.js
```

Local production-mode run against an on-disk store (smoke testing a build):

```bash
NODE_ENV=production \
STORE_BACKEND=local \
STORE_DIR=./dist/.deploy-store \
node server/dist/index.js
```
