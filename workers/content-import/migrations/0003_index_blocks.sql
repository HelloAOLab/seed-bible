-- Website imports read Common Crawl's index files directly: each lookup
-- after the first reads one block of a crawl's index. JSON {file, offset,
-- length}; NULL for the first lookup, which finds the blocks.
ALTER TABLE site_lookups ADD COLUMN block TEXT;
