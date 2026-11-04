-- Website imports from Common Crawl. See docs/custom-content-database.md §5.7.

-- links | site
ALTER TABLE import_jobs ADD COLUMN kind TEXT NOT NULL DEFAULT 'links';
-- JSON for a website import: the site, its filters, the crawls looked in.
ALTER TABLE import_jobs ADD COLUMN site TEXT;
-- 1 when more pages matched than one import may offer.
ALTER TABLE import_jobs ADD COLUMN capped INTEGER NOT NULL DEFAULT 0;

-- Website imports list their pages and wait for the owner to pick before
-- they run, and still count as the library's one active import meanwhile.
DROP INDEX one_active_import;
CREATE UNIQUE INDEX one_active_import ON import_jobs (content_record_name)
  WHERE status IN ('listing', 'awaiting_pick', 'running', 'paused_signin');

-- Pages offered to the owner are import_items rows in state 'candidate',
-- deleted once the owner picks. These two columns let the listing keep the
-- newest capture of each page and skip copies of the same content.
ALTER TABLE import_items ADD COLUMN captured_at TEXT;
ALTER TABLE import_items ADD COLUMN digest TEXT;

-- The index lookups a website import makes: page -1 counts a crawl's result
-- pages, then one row per result page.
CREATE TABLE site_lookups (
  job_id TEXT NOT NULL,
  crawl_id TEXT NOT NULL,
  page INTEGER NOT NULL,
  -- queued | done | failed
  state TEXT NOT NULL,
  error TEXT,
  PRIMARY KEY (job_id, crawl_id, page)
);
