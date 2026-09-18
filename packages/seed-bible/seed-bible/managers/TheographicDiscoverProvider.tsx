import type {
  DiscoverContentResult,
  DiscoverContentType,
  DiscoverContext,
  DiscoverProvider,
  DiscoverResult,
} from "./DiscoverManager";
import type { BibleDataManager, BookId, VerseRef } from "./BibleDataManager";
import type { Dataset, TranslationBookChapter } from "./FreeUseBibleAPI";
import { requestToPromise, transactionToPromise } from "./indexedDbUtils";
import { extractContentText } from "./ChapterText";
import { TheographicEntityCard } from "../components/TheographicEntityCard/TheographicEntityCard";
import { PortalComponent } from "../components/PortalComponent/PortalComponent";
import type { PanesManager } from "./PanesManager";
import geoImporterPattern from "virtual:@pattern/geo-importer";
import { v4 as uuid } from "uuid";

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
 * rather than touching IndexedDB directly, which is what lets tests swap in
 * {@link createInMemoryTheographicStore}.
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

interface StoredRecord {
  /** The API path this record was fetched from. */
  key: string;
  value: unknown;
  fetchedAtMs: number;
}

export interface TheographicStore {
  /**
   * The cached record for a path, or null when it was never cached or has
   * aged past {@link THEOGRAPHIC_CACHE_TTL_MS}.
   */
  get<T>(key: string): Promise<T | null>;

  put(key: string, value: unknown): Promise<void>;

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
    async get<T>(key: string): Promise<T | null> {
      const database = await openDatabase();
      const transaction = database.transaction(RECORDS_STORE, "readonly");
      const record = await requestToPromise<StoredRecord | undefined>(
        transaction.objectStore(RECORDS_STORE).get(key)
      );

      if (!record) {
        return null;
      }
      if (Date.now() - record.fetchedAtMs > THEOGRAPHIC_CACHE_TTL_MS) {
        return null;
      }
      return record.value as T;
    },

    async put(key: string, value: unknown): Promise<void> {
      const database = await openDatabase();
      const transaction = database.transaction(RECORDS_STORE, "readwrite");
      transaction
        .objectStore(RECORDS_STORE)
        .put({ key, value, fetchedAtMs: Date.now() } satisfies StoredRecord);
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

/** In-memory stand-in with the same expiry rules, for tests. */
export function createInMemoryTheographicStore(): TheographicStore {
  const records = new Map<string, StoredRecord>();

  return {
    async get<T>(key: string): Promise<T | null> {
      const record = records.get(key);
      if (!record) {
        return null;
      }
      if (Date.now() - record.fetchedAtMs > THEOGRAPHIC_CACHE_TTL_MS) {
        return null;
      }
      return record.value as T;
    },

    async put(key: string, value: unknown): Promise<void> {
      records.set(key, { key, value, fetchedAtMs: Date.now() });
    },

    async clear(): Promise<void> {
      records.clear();
    },
  };
}

/* ------------------------------------------------------------------ *
 * Reading the dataset.
 * ------------------------------------------------------------------ */

/** Reads the dataset, preferring the on-device cache over the network. */
export interface TheographicClient {
  getChapter(
    book: string,
    chapter: number | string
  ): Promise<TheographicBookChapter>;
  /** Follows an entry's `apiLink` to its full record. */
  getEntity<T>(apiLink: string): Promise<T>;
}

/**
 * A place as a GeoJSON point, ready to hand to the geo-importer map.
 *
 * A bare `Feature` rather than a `FeatureCollection` on purpose: the importer
 * labels and focuses the map on a lone `Feature`, while a collection is drawn
 * without either unless it also carries `metadata.name` and a `bbox`.
 */
export interface PlaceGeoJsonFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    /**
     * Latitude first, then longitude — deliberately *not* GeoJSON's documented
     * `[longitude, latitude]` order.
     *
     * The importer feeds `coordinates[0]` to the bot's dimension X and
     * `coordinates[1]` to Y (see `geometryHandlers.tsx`), and this map portal
     * takes X as the latitude. Confirmed by opening a place and seeing where
     * the pin lands. Swapping these to match the spec puts every place
     * roughly 1,500 km from where it belongs, so leave the order alone.
     */
    coordinates: [number, number];
  };
  properties: {
    /**
     * Required by the importer's schema, and what it draws as the map label —
     * so this is the readable name ("Egypt"), not the dataset's slug
     * ("egypt_362").
     */
    id: string;
    name: string;
    featureType?: string;
  };
}

/**
 * Turns a place's coordinates into a GeoJSON point.
 *
 * Null when the dataset has no position for it — about 20 of its 1,274 places,
 * which callers use to decide there is nothing to show on a map.
 */
export function placeToGeoJson(
  place: TheographicPlaceEntry
): PlaceGeoJsonFeature | null {
  const { latitude, longitude } = place;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [latitude, longitude],
    },
    properties: {
      id: place.name,
      name: place.name,
      ...(place.featureType ? { featureType: place.featureType } : {}),
    },
  };
}

/**
 * Opens a place as a point on the geo-importer map, in its own floating pane.
 *
 * Lives here rather than at the registration site because everything it needs
 * is this module's own — the GeoJSON conversion above, and the pane it draws
 * into. Returns null without a `PanesManager`, which is how the card decides
 * whether to offer the control at all.
 */
export function createOpenPlace(
  panes: PanesManager | undefined
): ((place: TheographicPlaceEntry) => void) | undefined {
  if (!panes) {
    return undefined;
  }

  return (place) => {
    const geojson = placeToGeoJson(place);
    if (!geojson) {
      return;
    }

    const inst = uuid();

    panes.openPane({
      id: `theographic-place-${place.id}`,
      placement: "floating",
      title: place.name,
      component: () => (
        <PortalComponent
          portal="map"
          portalType="map"
          pattern={geoImporterPattern}
          inst={inst}
          query={{ mapData: JSON.stringify(geojson) }}
        />
      ),
    });
  };
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

/**
 * Reads the Theographic dataset from `endpoint`, keeping what it fetches.
 *
 * Three layers, cheapest first: an in-flight map so simultaneous callers share
 * one request (a chapter with forty places asks for forty records at once),
 * then `store` — IndexedDB, so the data survives a reload — then the network.
 *
 * A cache read that throws is treated as a miss rather than an error: storage
 * can be blocked or full, and reference data is never worth failing a render
 * over.
 */
export function createTheographicClient(
  endpoint: string,
  store: TheographicStore | null
): TheographicClient {
  const inFlight = new Map<string, Promise<unknown>>();

  const read = async <T,>(path: string): Promise<T> => {
    const pending = inFlight.get(path);
    if (pending) {
      return (await pending) as T;
    }

    const request = (async () => {
      if (store) {
        try {
          const cached = await store.get<T>(path);
          if (cached !== null) {
            return cached;
          }
        } catch {
          // Fall through to the network.
        }
      }

      const url = new URL(path, endpoint).href;
      const response = await fetch(url);
      if (response.status < 200 || response.status >= 300) {
        throw new Error(
          `Failed request to ${url}. Status: ${response.status} ${response.statusText}`
        );
      }
      const value = (await response.json()) as T;

      if (store) {
        try {
          await store.put(path, value);
        } catch {
          // A cache that won't accept writes still serves reads fine.
        }
      }
      return value;
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
  };
}

/**
 * The language the Theographic names are written in. The mention check below
 * can only ever run against a translation in this language, since matching an
 * English name against, say, Hindi verse text finds nothing.
 */
const THEOGRAPHIC_LANGUAGE = "eng";

/**
 * Whether to drop an entity from a verse whose text doesn't literally name it.
 *
 * Off, because Theographic's names are canonical while translations use
 * whatever form the passage uses, and the chapter listing carries no aliases to
 * bridge the two. Measured over seven chapters against the KJV, the check
 * removed 38% of entities outright — Abraham from Genesis 13 (called "Abram"
 * there), Paul from Acts 9 ("Saul"), Isaiah from Matthew 13 ("Esaias"), God
 * from Psalm 23 ("the LORD"), and every event, whose names are descriptive
 * labels rather than words in the text.
 *
 * What it does catch is a handful of over-broad links — "Jacob (Israel)" on
 * Exodus 4:29's "the children of Israel", which is the nation and not the man.
 * Worth revisiting if the API ever exposes per-entity alternate names; the
 * machinery and its tests are kept for that.
 */
const REQUIRE_NAME_IN_VERSE_TEXT = false;

/** Combining marks left behind by an NFD normalize. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Characters that carry no meaning for a name match. */
const NON_MATCHABLE = /[^\p{L}\p{N}]+/gu;

/**
 * Casefolds and strips accents so "Sidon" matches "Sïdon". Punctuation and
 * whitespace collapse to single spaces, and the result is padded so a caller
 * can test for " name " and get a whole-word match without a regex.
 */
export function normalizeForMatch(text: string): string {
  return ` ${text
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_MATCHABLE, " ")
    .trim()} `;
}

/**
 * The name to look for in the verse text.
 *
 * Theographic disambiguates with a trailing parenthetical, which may be an
 * alternate name ("Jacob (Israel)") or a qualifier ("Pharaoh (of the
 * Exodus)"). Nothing in the data distinguishes the two, so both are dropped
 * and the leading name is what must appear. That is also the behaviour we
 * want: "Jacob (Israel)" then keeps Exodus 4:5 ("the God of Jacob") and drops
 * 4:29 ("the children of Israel"), which is the nation rather than the man.
 */
export function primaryName(name: string): string {
  const parenthetical = name.indexOf("(");
  return parenthetical > 0 ? name.slice(0, parenthetical).trim() : name.trim();
}

/**
 * Whether `text` names `name` as a whole word.
 *
 * Both sides are padded by `normalizeForMatch`, so a plain `includes` is a
 * word-boundary test that also handles multi-word names ("Mount Hor") and
 * possessives ("Aaron's rod" → " aaron s rod " contains " aaron ").
 */
export function mentionsName(text: string, name: string): boolean {
  const needle = normalizeForMatch(primaryName(name));
  if (needle.trim().length === 0) {
    return false;
  }
  return normalizeForMatch(text).includes(needle);
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

/**
 * Narrows an entity's verses to the ones whose text actually names it.
 *
 * A verse the translation has no text for is kept rather than dropped — the
 * absence is a gap in what we can check, not evidence the entity isn't there.
 */
export function narrowToMentionedVerses(
  verses: readonly number[],
  name: string,
  verseText: Map<number, string>
): number[] {
  return verses.filter((verse) => {
    const text = verseText.get(verse);
    return text === undefined ? true : mentionsName(text, name);
  });
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
      contentType: "person_profile" as const,
      entry,
      description: personSubtitle(entry),
    })),
    ...places.map((entry) => ({
      contentType: "place_profile" as const,
      entry,
      description: "",
    })),
    ...events.map((entry) => ({
      contentType: "event" as const,
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
  onReferenceClick: (ref: VerseRef) => void;
  /** Where a place's map opens. Omit and the map control is not offered. */
  panes?: PanesManager;
}

/**
 * Turns one chapter's Theographic data into discovered content — a card per
 * person, place and event, each carrying the verses of this chapter it appears
 * in.
 */
export function toDiscoverResults(
  data: TheographicBookChapter,
  context: DiscoverContext,
  verseText: Map<number, string> | null,
  deps: Pick<TheographicProviderDeps, "client" | "onReferenceClick"> & {
    openPlace?: (place: TheographicPlaceEntry) => void;
  }
): DiscoverContentResult[] {
  const results: DiscoverContentResult[] = [];

  for (const { contentType, entry, description } of flattenChapter(data)) {
    const verses = verseText
      ? narrowToMentionedVerses(entry.verses, entry.name, verseText)
      : entry.verses;

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
          onReferenceClick={deps.onReferenceClick}
          openPlace={deps.openPlace}
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
 * Results are deliberately hidden from the discover panel's "All" view — see
 * `DISCOVER_CONTENT_TYPES_HIDDEN_BY_DEFAULT` — because a single chapter can
 * name dozens of entities, which would bury the reader's own notes.
 */
export function createTheographicDiscoverProvider(
  deps: TheographicProviderDeps
): DiscoverProvider {
  let hasWarned = false;
  const openPlace = createOpenPlace(deps.panes);

  return {
    id: "theographic",
    title: "Theographic Bible Metadata",
    description: "People, places, and events named in this chapter.",

    async discover(context: DiscoverContext): Promise<DiscoverResult[]> {
      let data: TheographicBookChapter;
      try {
        data = await deps.client.getChapter(context.book, context.chapter);
      } catch (error) {
        if (!isNotFound(error) && !hasWarned) {
          hasWarned = true;
          console.warn("Failed to load Theographic data.", error);
        }
        return [];
      }

      const verseText = await loadVerseText(deps.data, context);
      return toDiscoverResults(data, context, verseText, {
        client: deps.client,
        onReferenceClick: deps.onReferenceClick,
        openPlace,
      });
    },
  };
}

/**
 * The chapter's verse text, or null when the mention check cannot run.
 *
 * Null for any translation not in the dataset's language, and null when the
 * chapter text can't be loaded — in both cases the dataset's own verse links
 * stand, which lists a little more than it should rather than nothing at all.
 */
async function loadVerseText(
  data: BibleDataManager,
  context: DiscoverContext
): Promise<Map<number, string> | null> {
  if (
    !REQUIRE_NAME_IN_VERSE_TEXT ||
    context.language !== THEOGRAPHIC_LANGUAGE
  ) {
    return null;
  }

  try {
    const chapter = await data.getTranslationBookChapter(
      context.translationId,
      context.book,
      context.chapter
    );
    return chapterVerseText(chapter);
  } catch {
    return null;
  }
}

/** Whether a rejected request was a 404, which `_getJson` reports in its message. */
function isNotFound(error: unknown): boolean {
  return error instanceof Error && /\bStatus:\s*404\b/.test(error.message);
}
