import {
  openDB,
  type IDBPDatabase,
} from "https://cdn.jsdelivr.net/npm/idb@8.0.3/+esm";
import type { CorpusMeta, VerseIndexEntry } from "ext_AI_Transcript.main.types";

const META_KEY = "bibleCorpus.meta.v1";
const INDEX_KEY = "bibleCorpus.index.v1";
const LOCATION_KEY = "bibleCorpus.location.v1";

const DB_NAME = "bibleCorpus";
const DB_VERSION = 1;
const STORE = "index";
const IDB_INDEX_KEY = "verseIndex";

type StoreLocation = "local" | "idb";

let dbPromise: Promise<IDBPDatabase> | null = null;
function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  // Browsers report quota differently (name and/or code 22 / 1014).
  const name = e.name;
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    /quota/i.test(e.message)
  );
}

export interface LoadedCorpus {
  meta: CorpusMeta;
  index: VerseIndexEntry[];
}

export function createCorpusStorage() {
  /** Read the cached metadata record, if any. */
  function loadMeta(): CorpusMeta | null {
    try {
      const raw = localStorage.getItem(META_KEY);
      return raw ? (JSON.parse(raw) as CorpusMeta) : null;
    } catch {
      return null;
    }
  }

  function getLocation(): StoreLocation | null {
    const loc = localStorage.getItem(LOCATION_KEY);
    return loc === "local" || loc === "idb" ? loc : null;
  }

  function commitMeta(meta: CorpusMeta, location: StoreLocation): void {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    localStorage.setItem(LOCATION_KEY, location);
  }

  async function clearIdbIndex(): Promise<void> {
    try {
      const db = await getDb();
      await db.delete(STORE, IDB_INDEX_KEY);
    } catch {
      /* IndexedDB may be unavailable; ignore. */
    }
  }

  /** Load the full cached corpus (meta + index), or null if unavailable. */
  async function load(): Promise<LoadedCorpus | null> {
    const meta = loadMeta();
    if (!meta) return null;
    const location = getLocation();
    if (!location) return null;

    if (location === "local") {
      const raw = localStorage.getItem(INDEX_KEY);
      if (!raw) return null;
      try {
        return { meta, index: JSON.parse(raw) as VerseIndexEntry[] };
      } catch {
        return null;
      }
    }

    // IndexedDB
    try {
      const db = await getDb();
      const index = (await db.get(STORE, IDB_INDEX_KEY)) as
        | VerseIndexEntry[]
        | undefined;
      if (!index) return null;
      return { meta, index };
    } catch {
      return null;
    }
  }

  /** Persist the corpus. Tries localStorage; falls back to IndexedDB on quota. */
  async function save(
    meta: CorpusMeta,
    index: VerseIndexEntry[]
  ): Promise<StoreLocation> {
    const json = JSON.stringify(index);
    try {
      localStorage.setItem(INDEX_KEY, json);
      commitMeta(meta, "local");
      await clearIdbIndex(); // drop any stale IDB copy
      return "local";
    } catch (e) {
      if (!isQuotaError(e)) throw e;
      // Too big for localStorage — fall back to IndexedDB for the index.
      localStorage.removeItem(INDEX_KEY);
      const db = await getDb();
      await db.put(STORE, index, IDB_INDEX_KEY);
      commitMeta(meta, "idb");
      return "idb";
    }
  }

  /** Remove all cached corpus data from both stores. */
  async function clear(): Promise<void> {
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(INDEX_KEY);
    localStorage.removeItem(LOCATION_KEY);
    await clearIdbIndex();
  }

  return { loadMeta, load, save, clear };
}

/** The corpus storage instance type (created once in the app's entry point). */
export type CorpusStorage = ReturnType<typeof createCorpusStorage>;
