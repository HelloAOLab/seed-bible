# Content import worker

Runs content-library imports and publishing for Custom Branding on Cloudflare
Workers. Design: [`docs/custom-content-database.md`](../../docs/custom-content-database.md) §5.8.

- **HTTP API** (`src/api.ts`, `src/siteImports.ts`): start an import, check on it, cancel, resume, publish, and look a website up in Common Crawl then import the pages the owner picks. Every call carries the owner's CasualOS session key and is checked with CasualOS (`getUserInfo`) first; the worker only ever acts as that owner.
- **Queue** (`src/consumer.ts`): one message per link. Each fills in the link's details (CasualOS `getLinkPreview`) and saves it to the library for review. Failures retry with growing waits; after 5 attempts the dead-letter queue marks the link failed.
- **D1** (`migrations/`, `src/jobs.ts`): imports and their links, with the owner's session key encrypted (AES-GCM) and erased when the import stops.
- **`LibraryWriter` Durable Object** (`src/libraryWriter.ts`): the one writer of a library's chapter records.
- **`CommonCrawlGate` Durable Object** (`src/commonCrawlGate.ts`): the single lane to Common Crawl's index, one request at a time for all owners. Pages themselves are read from `data.commoncrawl.org` with range requests (`src/commonCrawl/`). The worker never fetches the owner's site.
- **Cron** (`src/cleanup.ts`): every 15 minutes, re-queues links whose consumer died, ends imports older than 7 days (and website lookups nobody picked from after a day), and deletes old rows.

It has no npm dependencies of its own: it bundles `zod` and the shared code in `packages/seed-bible/seed-bible/managers/customContent/` from the repo. The Cloudflare APIs it uses are described in `src/platform.ts` rather than with `@cloudflare/workers-types`, whose globals clash with the DOM types the rest of the repo is type-checked against.

## Environments

There are two separate deployments, each with its own D1 database, queues and `SESSION_KEY_SECRET`, so testing on alpha never touches production data:

| Environment  | Deployed from | Worker                            | Used by                                                                                 |
| ------------ | ------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| `alpha`      | `develop`     | `seed-bible-content-import-alpha` | `alpha.seedbible.org`: `develop` and every other branch's preview (under `/b/<branch>`) |
| `production` | `main`        | `seed-bible-content-import`       | `seedbible.org` and `prod.seedbible.org`                                                |

A feature branch's preview therefore talks to the alpha worker, which runs `develop`'s worker code. Worker changes on a branch take effect on alpha once they're merged into `develop`. Every `wrangler` command takes `--env alpha` or `--env production`.

## One-time setup

With a Cloudflare account and `wrangler` (the version pinned in `.github/workflows/cd.yml`), create each environment's resources:

```bash
cd workers/content-import

# alpha
wrangler d1 create seed-bible-content-import-alpha    # note the database_id it prints
wrangler queues create seed-bible-content-import-alpha
wrangler queues create seed-bible-content-import-alpha-dlq
# 32 random bytes, base64. Keep a copy: losing it stops running imports.
openssl rand -base64 32 | wrangler secret put SESSION_KEY_SECRET --env alpha

# production
wrangler d1 create seed-bible-content-import          # note the database_id it prints
wrangler queues create seed-bible-content-import
wrangler queues create seed-bible-content-import-dlq
openssl rand -base64 32 | wrangler secret put SESSION_KEY_SECRET --env production
```

Use a different `SESSION_KEY_SECRET` for each. If the worker doesn't exist yet when you run `secret put`, wrangler offers to create it.

Then in the GitHub repository settings:

| Kind     | Name                                  | Value                                                                                        |
| -------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| Secret   | `CLOUDFLARE_API_TOKEN`                | API token with Workers, D1 and Queues edit access                                            |
| Secret   | `CLOUDFLARE_ACCOUNT_ID`               | The account id                                                                               |
| Variable | `CONTENT_IMPORT_ALPHA_D1_DATABASE_ID` | The alpha `database_id` from `wrangler d1 create`                                            |
| Variable | `CONTENT_IMPORT_D1_DATABASE_ID`       | The production `database_id`                                                                 |
| Variable | `CONTENT_IMPORT_ALPHA_URL`            | The alpha worker's URL, e.g. `https://seed-bible-content-import-alpha.<account>.workers.dev` |
| Variable | `CONTENT_IMPORT_URL`                  | The production worker's URL, e.g. `https://seed-bible-content-import.<account>.workers.dev`  |

Once the secrets exist, CD deploys the alpha worker on pushes to `develop` and the production worker on pushes to `main`, applying that environment's D1 migrations first. It builds `main` with `VITE_CONTENT_IMPORT_URL` set from `CONTENT_IMPORT_URL`, and every other branch from `CONTENT_IMPORT_ALPHA_URL`. Without the URL variable, a build still works: bulk import is hidden and publishing happens in the browser.

Each environment's `ALLOWED_ORIGINS` in `wrangler.toml` lists the origins its app is served from. Add any other host the app is served from, or its calls will be refused.

## Tests

`test/unit/content-import-worker/` runs the worker's handlers against real SQLite (Node's `node:sqlite`, through the same D1 interface), an in-memory CasualOS, and an in-memory Common Crawl (index answers and gzipped WARC records built in the test).
