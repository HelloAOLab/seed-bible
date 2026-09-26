import type {
  DiscoverContentResult,
  DiscoverContentType,
  DiscoverContext,
  DiscoverProvider,
  DiscoverResult,
} from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import type {
  BibleDataManager,
  BookId,
  VerseRef,
} from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type {
  Dataset,
  TranslationBookChapter,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { PanesManager } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type { ReadonlySignal } from "@preact/signals";
import {
  requestToPromise,
  transactionToPromise,
} from "@packages/seed-bible/seed-bible/managers/indexedDbUtils";
import { extractContentText } from "@packages/seed-bible/seed-bible/managers/ChapterText";
import { TheographicEntityCard } from "./TheographicEntityCard";
import { createIsPlaceOpen, createOpenPlace, type PlaceLocations } from "./map";
import {
  EVENT_CONTENT_TYPE,
  PERSON_CONTENT_TYPE,
  PLACE_CONTENT_TYPE,
} from "./contentTypes";

/* ------------------------------------------------------------------ *
 * The Theographic dataset's wire format, and how we read it.
 *
 * Kept here rather than on `FreeUseBibleAPI` because none of it is shared:
 * only this provider reads the dataset, and the caching it wants (persisted
 * to disk, since the data never changes per reader) is different from the
 * per-session response cache the translation client keeps.
 * ------------------------------------------------------------------ */

/** The dataset ID the people/places/events data is published under. */
export const THEOGRAPHIC_DATASET_ID = "theographic";

/**
 * An entity referenced from a Theographic record — a person's father, an
 * event's location, and so on. `apiLink` points at that entity's own record.
 */
export interface TheographicRelatedEntity {
  id: string;
  type: "people" | "places" | "events" | "groups";
  name: string;
  apiLink: string;
}

/** Shared by every entity listed under a Theographic chapter. */
interface TheographicChapterEntry {
  id: string;
  name: string;

  /** The link to this entity's own record. */
  apiLink: string;

  /**
   * The verses of this chapter the entity appears in. Ascending, and not
   * necessarily contiguous — Aaron appears in Exodus 4 at 14, 27, 28, 29, 30.
   */
  verses: number[];
}

export interface TheographicPersonEntry extends TheographicChapterEntry {
  gender?: string;
  isProperName?: boolean;
}

export interface TheographicPlaceEntry extends TheographicChapterEntry {
  featureType?: string;
  latitude?: number;
  longitude?: number;
}

export interface TheographicEventEntry extends TheographicChapterEntry {
  startDate?: string;
}

/**
 * The people, places and events named in one chapter.
 *
 * Chapters the dataset has nothing for are *absent* rather than empty, so a
 * request for one answers 404 — which this provider treats as "no results"
 * rather than an error.
 */
export interface TheographicBookChapter {
  dataset: Dataset;
  chapter: {
    number: number;
    people: TheographicPersonEntry[];
    places: TheographicPlaceEntry[];
    events: TheographicEventEntry[];
  };
  numberOfPeople: number;
  numberOfPlaces: number;
  numberOfEvents: number;
}

/** One passage an entity appears in, anywhere in the Bible. */
export interface TheographicReference {
  book: string;
  chapter: number;
  verse: number;
  endVerse?: number;
}

/** One person's full record, from a {@link TheographicPersonEntry}'s `apiLink`. */
export interface TheographicPersonDetail {
  dataset: Dataset;
  person: {
    id: string;
    name: string;
    gender?: string;
    isProperName?: boolean;
    description?: string[];
    birthYear?: number;
    deathYear?: number;
    birthPlace?: TheographicRelatedEntity;
    deathPlace?: TheographicRelatedEntity;
    father?: TheographicRelatedEntity[];
    mother?: TheographicRelatedEntity[];
    partners?: TheographicRelatedEntity[];
    children?: TheographicRelatedEntity[];
    siblings?: TheographicRelatedEntity[];
    memberOf?: TheographicRelatedEntity[];
    events?: TheographicRelatedEntity[];
    /** Every passage this entity appears in, across the whole Bible. */
    references?: TheographicReference[];
  };
}

/** One place's full record, from a {@link TheographicPlaceEntry}'s `apiLink`. */
export interface TheographicPlaceDetail {
  dataset: Dataset;
  place: {
    id: string;
    name: string;
    kjvName?: string;
    esvName?: string;
    featureType?: string;
    featureSubType?: string;
    latitude?: number;
    longitude?: number;
    description?: string[];
    comment?: string;
    /** Every passage this entity appears in, across the whole Bible. */
    references?: TheographicReference[];
  };
}

/** One event's full record, from a {@link TheographicEventEntry}'s `apiLink`. */
export interface TheographicEventDetail {
  dataset: Dataset;
  event: {
    id: string;
    name: string;
    startDate?: string;
    duration?: string;
    description?: string[];
    participants?: TheographicRelatedEntity[];
    locations?: TheographicRelatedEntity[];
    predecessor?: TheographicRelatedEntity;
    /** Every passage this entity appears in, across the whole Bible. */
    references?: TheographicReference[];
  };
}

/* ------------------------------------------------------------------ *
 * On-device cache.
 *
 * The dataset is read-only reference data, so once a record has been fetched
 * there is no reason to ask for it again. Caching it in IndexedDB means
 * revisiting a chapter costs nothing, and the people/places/events lists keep
 * working offline.
 *
 * Records are keyed by their API path, which is what the dataset itself uses
 * to address them (`/api/d/theographic/GEN/1.json`), so a cache key never has
 * to be derived twice. The client below goes through {@link TheographicStore}
 * rather than touching IndexedDB directly, which is what lets tests swap in an
 * in-memory one.
 * ------------------------------------------------------------------ */

export const THEOGRAPHIC_DB_NAME = "seed-bible-theographic";
export const THEOGRAPHIC_DB_VERSION = 1;

const RECORDS_STORE = "records";

/**
 * How long a cached record is served before it is fetched again.
 *
 * The data is effectively static, but it does receive corrections, and the API
 * itself only promises freshness for a day (`Cache-Control: max-age=86400`).
 * Thirty days keeps the cache genuinely useful while still letting a fix reach
 * readers without anyone clearing storage.
 */
export const THEOGRAPHIC_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * How long a "this chapter doesn't exist" answer is remembered: the API's own
 * one day, so a chapter the dataset gains shows up by the next day.
 */
export const THEOGRAPHIC_NOT_FOUND_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * What the cache holds for one path: the record itself, or the fact that
 * there is nothing usable there — far smaller than the 1 MB outline of Crete
 * it can stand in for.
 */
export interface CachedRecord {
  value?: unknown;
  /** Set when `value` is absent. Records written before this field have neither. */
  outcome?: "not-found" | "too-large";
  /** For "too-large": how long the body was, in characters. */
  length?: number;
  fetchedAtMs: number;
}

interface StoredRecord extends CachedRecord {
  /** The path this record was fetched from. */
  key: string;
}

export interface TheographicStore {
  /** The cached record for a path, however old, or null when there is none. */
  get(key: string): Promise<CachedRecord | null>;

  put(key: string, record: CachedRecord): Promise<void>;

  /** Deletes every record fetched before `cutoffMs`. */
  prune(cutoffMs: number): Promise<void>;

  /** Drops everything. Exposed for tests and for a future "clear data" action. */
  clear(): Promise<void>;
}

/**
 * Creates the IndexedDB-backed cache.
 *
 * Returns null when IndexedDB is unavailable — during server-side rendering,
 * and in browsers that block storage (private windows in some browsers, or a
 * sandboxed iframe). Callers treat null as "no cache here" and fetch every
 * time, rather than failing.
 */
export function createIndexedDbTheographicStore(): TheographicStore | null {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  let databasePromise: Promise<IDBDatabase> | null = null;

  const openDatabase = (): Promise<IDBDatabase> => {
    if (databasePromise) {
      return databasePromise;
    }

    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(
        THEOGRAPHIC_DB_NAME,
        THEOGRAPHIC_DB_VERSION
      );

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(RECORDS_STORE)) {
          database.createObjectStore(RECORDS_STORE, { keyPath: "key" });
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          databasePromise = null;
        };
        resolve(database);
      };

      request.onerror = () =>
        reject(
          request.error ?? new Error("Failed to open the Theographic cache.")
        );
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });

    return databasePromise;
  };

  return {
    async get(key: string): Promise<CachedRecord | null> {
      const database = await openDatabase();
      const transaction = database.transaction(RECORDS_STORE, "readonly");
      const record = await requestToPromise<StoredRecord | undefined>(
        transaction.objectStore(RECORDS_STORE).get(key)
      );
      return record ?? null;
    },

    async put(key: string, record: CachedRecord): Promise<void> {
      const database = await openDatabase();
      const transaction = database.transaction(RECORDS_STORE, "readwrite");
      transaction
        .objectStore(RECORDS_STORE)
        .put({ ...record, key } satisfies StoredRecord);
      await transactionToPromise(transaction);
    },

    async prune(cutoffMs: number): Promise<void> {
      const database = await openDatabase();
      const transaction = database.transaction(RECORDS_STORE, "readwrite");
      const cursorRequest = transaction.objectStore(RECORDS_STORE).openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          return;
        }
        if ((cursor.value as StoredRecord).fetchedAtMs < cutoffMs) {
          cursor.delete();
        }
        cursor.continue();
      };
      await transactionToPromise(transaction);
    },

    async clear(): Promise<void> {
      const database = await openDatabase();
      const transaction = database.transaction(RECORDS_STORE, "readwrite");
      transaction.objectStore(RECORDS_STORE).clear();
      await transactionToPromise(transaction);
    },
  };
}

/* ------------------------------------------------------------------ *
 * Reading the dataset.
 * ------------------------------------------------------------------ */

/**
 * A request the client couldn't answer with data. Callers branch on `reason`:
 * "not-found" is the dataset's normal answer for a chapter it has nothing
 * for, and "too-large" a body longer than the caller's `maxLength`.
 */
export class TheographicRequestError extends Error {
  constructor(
    readonly url: string,
    readonly reason: "not-found" | "too-large" | "failed",
    readonly status: number | null = null,
    detail = ""
  ) {
    super(
      `Failed request to ${url}.` +
        (status != null ? ` Status: ${status}` : "") +
        (detail ? ` ${detail}` : "")
    );
    this.name = "TheographicRequestError";
  }
}

export interface ReadOptions {
  /**
   * The longest body, in characters, the caller can use. A longer one rejects
   * with a "too-large" error, and only that fact is cached.
   */
  maxLength?: number;
}

/** Reads the dataset, preferring the on-device cache over the network. */
export interface TheographicClient {
  getChapter(
    book: string,
    chapter: number | string
  ): Promise<TheographicBookChapter>;
  /** Follows an entry's `apiLink` to its full record. */
  getEntity<T>(apiLink: string): Promise<T>;
  /**
   * Any other JSON file, by absolute URL, through the same cache: the
   * locations extension's GeoJSON files.
   */
  getResource<T>(url: string, options?: ReadOptions): Promise<T>;
}

/** The path one chapter of the dataset lives at. Doubles as its cache key. */
export function theographicChapterPath(
  book: string,
  chapter: number | string
): string {
  return `/api/d/${THEOGRAPHIC_DATASET_ID}/${encodeURIComponent(
    book
  )}/${encodeURIComponent(String(chapter))}.json`;
}

function isFresh(record: CachedRecord, nowMs: number): boolean {
  const ttl =
    record.outcome === "not-found"
      ? THEOGRAPHIC_NOT_FOUND_TTL_MS
      : THEOGRAPHIC_CACHE_TTL_MS;
  return nowMs - record.fetchedAtMs <= ttl;
}

/**
 * Reads the Theographic dataset from `endpoint`, keeping what it fetches.
 *
 * Three layers, cheapest first: an in-flight map so simultaneous callers share
 * one request (a chapter with forty places asks for forty records at once),
 * then `store` — IndexedDB, so the data survives a reload — then the network.
 *
 * A cache read or write that throws is ignored rather than surfaced: storage
 * can be blocked or full, and reference data is never worth failing a render
 * over.
 */
export function createTheographicClient(
  endpoint: string,
  store: TheographicStore | null
): TheographicClient {
  const inFlight = new Map<string, Promise<unknown>>();
  let hasPruned = false;

  const remember = async (
    path: string,
    record: Omit<CachedRecord, "fetchedAtMs">
  ) => {
    try {
      await store?.put(path, { ...record, fetchedAtMs: Date.now() });
    } catch {
      // A cache that won't accept writes still serves reads fine.
    }
  };

  const fromCache = async (
    path: string,
    url: string,
    options: ReadOptions
  ): Promise<{ value: unknown } | null> => {
    let cached: CachedRecord | null;
    try {
      cached = (await store?.get(path)) ?? null;
    } catch {
      return null;
    }
    if (!cached || !isFresh(cached, Date.now())) {
      return null;
    }
    if (cached.outcome === "not-found") {
      throw new TheographicRequestError(url, "not-found", 404);
    }
    if (cached.outcome === "too-large") {
      // Only known to be too long for a caller as strict as the one that
      // cached it; one allowing more has to fetch it to find out.
      if (
        options.maxLength !== undefined &&
        (cached.length ?? Infinity) > options.maxLength
      ) {
        throw new TheographicRequestError(url, "too-large");
      }
      return null;
    }
    return { value: cached.value };
  };

  const fetchAndRemember = async (
    path: string,
    url: string,
    options: ReadOptions
  ): Promise<unknown> => {
    const response = await fetch(url);
    if (response.status === 404) {
      await remember(path, { outcome: "not-found" });
      throw new TheographicRequestError(url, "not-found", 404);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new TheographicRequestError(
        url,
        "failed",
        response.status,
        response.statusText
      );
    }

    const text = await response.text();
    if (options.maxLength !== undefined && text.length > options.maxLength) {
      await remember(path, { outcome: "too-large", length: text.length });
      throw new TheographicRequestError(url, "too-large");
    }
    const value: unknown = JSON.parse(text);
    await remember(path, { value });
    return value;
  };

  const read = async <T,>(
    path: string,
    options: ReadOptions = {}
  ): Promise<T> => {
    if (store && !hasPruned) {
      // Expired records are otherwise only replaced when revisited, so the
      // ones that never are would stay on the device for good.
      hasPruned = true;
      void store
        .prune(Date.now() - THEOGRAPHIC_CACHE_TTL_MS)
        .catch(() => undefined);
    }

    const pending = inFlight.get(path);
    if (pending) {
      return (await pending) as T;
    }

    const url = new URL(path, endpoint).href;
    const request = (async () => {
      const cached = await fromCache(path, url, options);
      return cached ? cached.value : fetchAndRemember(path, url, options);
    })();

    inFlight.set(path, request);
    try {
      return (await request) as T;
    } finally {
      inFlight.delete(path);
    }
  };

  return {
    getChapter: (book, chapter) =>
      read<TheographicBookChapter>(theographicChapterPath(book, chapter)),
    getEntity: <T,>(apiLink: string) => read<T>(apiLink),
    getResource: <T,>(url: string, options?: ReadOptions) =>
      read<T>(url, options),
  };
}

/** Verse number → that verse's prose, for every verse in a chapter. */
export function chapterVerseText(
  chapter: TranslationBookChapter
): Map<number, string> {
  const byVerse = new Map<number, string>();
  for (const content of chapter.chapter.content) {
    if (content.type === "verse") {
      byVerse.set(content.number, extractContentText(content.content));
    }
  }
  return byVerse;
}

function personSubtitle(entry: TheographicPersonEntry): string {
  return entry.gender ?? "";
}

function eventSubtitle(entry: TheographicEventEntry): string {
  return entry.startDate ?? "";
}

interface MappedEntry {
  contentType: DiscoverContentType;
  entry: TheographicPersonEntry | TheographicPlaceEntry | TheographicEventEntry;
  description: string;
}

/** Every entity in a Theographic chapter, tagged with the type it maps to. */
function flattenChapter(data: TheographicBookChapter): MappedEntry[] {
  const { people = [], places = [], events = [] } = data.chapter;
  return [
    ...people.map((entry) => ({
      contentType: PERSON_CONTENT_TYPE,
      entry,
      description: personSubtitle(entry),
    })),
    ...places.map((entry) => ({
      contentType: PLACE_CONTENT_TYPE,
      entry,
      description: "",
    })),
    ...events.map((entry) => ({
      contentType: EVENT_CONTENT_TYPE,
      entry,
      description: eventSubtitle(entry),
    })),
  ];
}

export interface TheographicProviderDeps {
  /** Reads the dataset, cache first. */
  client: TheographicClient;
  /** Resolves the endpoint and offline copy for the chapter being checked. */
  data: BibleDataManager;
  /**
   * Navigates to a reference. `origin` is the chapter the card was showing,
   * so the caller can navigate the tab that is actually showing it.
   */
  onReferenceClick: (ref: VerseRef, origin?: ReferenceOrigin) => void;
  /** Where a place's map opens. Omit and the map control is not offered. */
  panes?: PanesManager;
  /** The locations extension's lookup, for places it has a file for. */
  locations?: PlaceLocations;
  /** Whether the reader is on a phone-sized screen; hides "Open in map". */
  isMobile?: ReadonlySignal<boolean>;
}

/** The chapter a card was discovered for. */
export interface ReferenceOrigin {
  translationId: string;
  book: string;
  chapter: number;
}

/** A passage's text, ready to quote in a card. */
export interface QuotedPassage {
  text: string;
  /** The translation's short name, e.g. "BSB". */
  translation: string;
}

/**
 * Scripture as the reader currently sees it: book names and verse text in
 * the tab's own translation, so a card's labels and quotes match the page.
 */
export interface ScriptureReader {
  /** The translation's name for a book, e.g. "1 Chronicles"; its id if unknown. */
  bookName(bookId: string): string;
  /** The text of a passage, or null when it can't be loaded. */
  readPassage(ref: TheographicReference): Promise<QuotedPassage | null>;
}

/** Reads scripture in `translationId` through the app's own data manager. */
export function createScriptureReader(
  data: BibleDataManager,
  translationId: string
): ScriptureReader {
  return {
    bookName(bookId) {
      const book = data
        .getCachedTranslationBooks(translationId)
        ?.books.find((candidate) => candidate.id === bookId);
      return book?.commonName ?? book?.name ?? bookId;
    },

    async readPassage(ref) {
      try {
        // The reader's own chapter is already cached; any other chapter is one
        // request, made only when the reader picks that mention.
        const chapter = await data.getTranslationBookChapter(
          translationId,
          ref.book,
          ref.chapter
        );
        const last = ref.endVerse ?? ref.verse;
        const verses = chapterVerseText(chapter);
        const text = Array.from({ length: last - ref.verse + 1 }, (_, i) =>
          verses.get(ref.verse + i)
        )
          .filter((verse): verse is string => !!verse)
          .join(" ");
        return text
          ? {
              text,
              translation: chapter.translation?.shortName ?? translationId,
            }
          : null;
      } catch {
        return null;
      }
    },
  };
}

/**
 * Turns one chapter's Theographic data into discovered content — a card per
 * person, place and event, each carrying the verses of this chapter it appears
 * in.
 */
export function toDiscoverResults(
  data: TheographicBookChapter,
  context: DiscoverContext,
  deps: Pick<
    TheographicProviderDeps,
    "client" | "onReferenceClick" | "locations" | "isMobile"
  > & {
    openPlace?: (place: TheographicPlaceEntry) => void;
    isPlaceOpen?: (place: TheographicPlaceEntry) => boolean;
    scripture?: ScriptureReader;
  }
): DiscoverContentResult[] {
  const results: DiscoverContentResult[] = [];

  for (const { contentType, entry, description } of flattenChapter(data)) {
    const { verses } = entry;

    if (verses.length === 0) {
      continue;
    }

    results.push({
      type: "content",
      contentType,
      verses,
      title: entry.name,
      description,
      reference: {
        book: context.book,
        chapter: context.chapter,
        verse: verses[0]!,
        endVerse: verses[verses.length - 1]!,
      },
      content: (
        <TheographicEntityCard
          contentType={contentType}
          entry={entry}
          description={description}
          verses={verses}
          book={context.book as BookId}
          chapter={context.chapter}
          dataset={data.dataset}
          client={deps.client}
          onReferenceClick={(ref) =>
            deps.onReferenceClick(ref, {
              translationId: context.translationId,
              book: context.book,
              chapter: context.chapter,
            })
          }
          openPlace={deps.openPlace}
          isPlaceOpen={deps.isPlaceOpen}
          isMobile={deps.isMobile}
          locations={deps.locations}
          scripture={deps.scripture}
        />
      ),
    });
  }

  return results;
}

/**
 * Surfaces the Theographic dataset's people, places and events as discovered
 * content for the chapter being read.
 *
 * Their content types are registered `hiddenByDefault` (see `init.tsx`), so
 * they stay out of the discover panel's "All" view: a single chapter can name
 * dozens of entities, which would bury the reader's own notes.
 */
export function createTheographicDiscoverProvider(
  deps: TheographicProviderDeps
): DiscoverProvider {
  let hasWarned = false;
  const openPlace = createOpenPlace(deps.panes, {
    client: deps.client,
    locations: deps.locations,
  });
  const isPlaceOpen = createIsPlaceOpen(deps.panes);

  return {
    id: "theographic",
    title: "Theographic Bible Metadata",
    description: "People, places, and events named in this chapter.",

    async discover(context: DiscoverContext): Promise<DiscoverResult[]> {
      let data: TheographicBookChapter;
      try {
        data = await deps.client.getChapter(context.book, context.chapter);
      } catch (error) {
        const isNotFound =
          error instanceof TheographicRequestError &&
          error.reason === "not-found";
        if (!isNotFound && !hasWarned) {
          hasWarned = true;
          console.warn("Failed to load Theographic data.", error);
        }
        return [];
      }

      return toDiscoverResults(data, context, {
        client: deps.client,
        onReferenceClick: deps.onReferenceClick,
        locations: deps.locations,
        isMobile: deps.isMobile,
        openPlace,
        isPlaceOpen,
        scripture: createScriptureReader(deps.data, context.translationId),
      });
    },
  };
}
