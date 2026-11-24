-- An import keeps one queue message per slot, each taking the next link
-- that's ready, so a link's retries are tracked on its row.

-- When a link that failed for a passing reason may be tried again.
ALTER TABLE import_items ADD COLUMN retry_at INTEGER;
-- When the import last started a link. The cleanup job restarts an import
-- with links waiting and none started for a while: its messages were lost.
ALTER TABLE import_jobs ADD COLUMN active_at INTEGER;
