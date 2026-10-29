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

## One-time setup

With a Cloudflare account and `wrangler` (the version pinned in `.github/workflows/cd.yml`):

```bash
cd workers/content-import
wrangler d1 create seed-bible-content-import          # note the database_id it prints
wrangler queues create seed-bible-content-import
wrangler queues create seed-bible-content-import-dlq
# 32 random bytes, base64. Keep a copy: losing it pauses running imports.
openssl rand -base64 32 | wrangler secret put SESSION_KEY_SECRET
```

Then in the GitHub repository settings:

| Kind     | Name                            | Value                                                                            |
| -------- | ------------------------------- | -------------------------------------------------------------------------------- |
| Secret   | `CLOUDFLARE_API_TOKEN`          | API token with Workers, D1 and Queues edit access                                |
| Secret   | `CLOUDFLARE_ACCOUNT_ID`         | The account id                                                                   |
| Variable | `CONTENT_IMPORT_D1_DATABASE_ID` | The `database_id` from `wrangler d1 create`                                      |
| Variable | `CONTENT_IMPORT_URL`            | The worker's URL, e.g. `https://seed-bible-content-import.<account>.workers.dev` |

CD deploys the worker (and applies D1 migrations) on pushes to `main` once the secrets exist, and builds the app with `VITE_CONTENT_IMPORT_URL` set from `CONTENT_IMPORT_URL`. Without that variable the app still works: bulk import is hidden and publishing happens in the browser.

`ALLOWED_ORIGINS` in `wrangler.toml` lists the origins the app is served from: `seedbible.org`, `prod.seedbible.org`, and `alpha.seedbible.org`, where branch previews live under `/b/<branch>`. Add any other host the app is served from, or its calls will be refused.

## Tests

`test/unit/content-import-worker/` runs the worker's handlers against real SQLite (Node's `node:sqlite`, through the same D1 interface), an in-memory CasualOS, and an in-memory Common Crawl (index answers and gzipped WARC records built in the test).
