import type {
  CachedRecord,
  TheographicStore,
} from "@packages/theographic-extension/ext_theographic/provider";

/** An in-memory stand-in for the IndexedDB cache. */
export function createInMemoryTheographicStore(): TheographicStore & {
  records: Map<string, CachedRecord>;
} {
  const records = new Map<string, CachedRecord>();

  return {
    records,
    async get(key) {
      return records.get(key) ?? null;
    },
    async put(key, record) {
      records.set(key, record);
    },
    async prune(cutoffMs) {
      for (const [key, record] of records) {
        if (record.fetchedAtMs < cutoffMs) {
          records.delete(key);
        }
      }
    },
    async clear() {
      records.clear();
    },
  };
}
