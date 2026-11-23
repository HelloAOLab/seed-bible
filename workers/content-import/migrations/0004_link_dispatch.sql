-- An import's links are no longer queued one message each. A few messages
-- per import each take the next link that's ready, so these move what the
-- queue used to track per message onto the rows.

-- When a link that failed for a passing reason may be tried again.
ALTER TABLE import_items ADD COLUMN retry_at INTEGER;
-- When the import last started a link. The cleanup job restarts an import
-- with links waiting and none started for a while: its messages were lost.
ALTER TABLE import_jobs ADD COLUMN active_at INTEGER;
