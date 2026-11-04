-- Imports and their links. See docs/custom-content-database.md §5.8.

CREATE TABLE import_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_record_name TEXT NOT NULL,
  -- running | paused_signin | cancelled | done | expired
  status TEXT NOT NULL,
  -- The owner's session key, encrypted. NULL as soon as the import stops.
  session_key_enc TEXT,
  default_author TEXT,
  total INTEGER NOT NULL,
  skipped INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  finished_at INTEGER
);

-- At most one import that can still move on per library.
CREATE UNIQUE INDEX one_active_import ON import_jobs (content_record_name)
  WHERE status IN ('running', 'paused_signin');

CREATE INDEX import_jobs_by_status ON import_jobs (status, expires_at);

CREATE TABLE import_items (
  job_id TEXT NOT NULL,
  -- Also the item's address in the content record (item.<id>).
  item_id TEXT NOT NULL,
  url TEXT NOT NULL,
  -- JSON: what the owner supplied for this link (ImportItemInput).
  input TEXT NOT NULL,
  -- queued | running | done | failed
  state TEXT NOT NULL,
  -- Set while running; once it passes, the item's slot frees itself.
  lease_until INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  PRIMARY KEY (job_id, item_id)
);

CREATE INDEX import_items_by_state ON import_items (job_id, state);
CREATE INDEX import_items_by_lease ON import_items (state, lease_until);
