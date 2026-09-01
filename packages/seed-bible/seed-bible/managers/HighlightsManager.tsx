import * as z from "zod/v4";
import type { LoginManager } from "../managers/LoginManager";
import {
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import {
  canonicalize,
  createIndexedDbRecordStore,
  LOCAL_OWNER,
  recordKey,
  type OfflineRecordStore,
  type SyncDomain,
} from "./OfflineRecordStore";
import {
  createRecordSyncManager,
  type RecordSyncManager,
} from "./RecordSyncManager";

/**
 * Zod schema for a highlighted verse target.
 *
 * A highlight can target either:
 * - a single verse number (for example `5`), or
 * - an inclusive range tuple `[start, end]` (for example `[5, 9]`).
 */
const verseSchema = z.union([
  z.number().int().positive(),
  z
    .tuple([z.number().int().positive(), z.number().int().positive()])
    .refine(([start, end]) => start <= end, {
      message: "Verse range start must be less than or equal to end.",
    }),
]);

/** Schema for one chapter highlight entry. */
export const chapterHighlightSchema = z.object({
  colorId: z.string().min(1),
  verse: verseSchema,

  customColor: z.string().min(1).optional(),
  customFontColor: z.string().min(1).optional(),
});

/** Schema for persisted chapter highlights payload. */
export const chapterHighlightsSchema = z.object({
  highlights: z.array(chapterHighlightSchema),
});

/** Single verse target or inclusive verse range tuple. */
export type Verse = z.infer<typeof verseSchema>;
/** Highlight entry with style + verse targeting data. */
export type ChapterHighlight = z.infer<typeof chapterHighlightSchema>;
/** Container payload used in storage and reactive signals. */
export type ChapterHighlights = z.infer<typeof chapterHighlightsSchema>;

type VerseRange = {
  start: number;
  end: number;
};

type RangeHighlight = {
  start: number;
  end: number;
  colorId: string;

  customColor?: string;
  customFontColor?: string;
};

const highlightStyleSchema = chapterHighlightSchema.omit({ verse: true });
const verseNumbersSchema = z.array(z.number().int().positive());

/**
 * Returns whether a highlight range includes the given verse number.
 */
export function highlightContainsVerse(
  highlight: ChapterHighlight,
  verseNumber: number
): boolean {
  const range = toVerseRange(highlight.verse);
  return verseNumber >= range.start && verseNumber <= range.end;
}

function toVerseRange(verse: Verse): VerseRange {
  if (typeof verse === "number") {
    return {
      start: verse,
      end: verse,
    };
  }

  return {
    start: verse[0],
    end: verse[1],
  };
}

function fromVerseRange(range: VerseRange): Verse {
  if (range.start === range.end) {
    return range.start;
  }

  return [range.start, range.end];
}

function rangesOverlap(a: VerseRange, b: VerseRange): boolean {
  return a.start <= b.end && b.start <= a.end;
}

function subtractRange(source: VerseRange, remove: VerseRange): VerseRange[] {
  if (!rangesOverlap(source, remove)) {
    return [source];
  }

  const next: VerseRange[] = [];

  if (remove.start > source.start) {
    next.push({
      start: source.start,
      end: remove.start - 1,
    });
  }

  if (remove.end < source.end) {
    next.push({
      start: remove.end + 1,
      end: source.end,
    });
  }

  return next;
}

function toRangeHighlight(highlight: ChapterHighlight): RangeHighlight {
  const range = toVerseRange(highlight.verse);
  return {
    start: range.start,
    end: range.end,
    colorId: highlight.colorId,
    customColor: highlight.customColor,
    customFontColor: highlight.customFontColor,
  };
}

function fromRangeHighlight(highlight: RangeHighlight): ChapterHighlight {
  return {
    colorId: highlight.colorId,
    verse: fromVerseRange({
      start: highlight.start,
      end: highlight.end,
    }),
    customColor: highlight.customColor,
    customFontColor: highlight.customFontColor,
  };
}

function removeRangeFromHighlights(
  highlights: RangeHighlight[],
  removeRange: VerseRange
): RangeHighlight[] {
  return highlights.flatMap((highlight) => {
    const pieces = subtractRange(
      {
        start: highlight.start,
        end: highlight.end,
      },
      removeRange
    );

    return pieces.map((piece) => ({
      ...highlight,
      start: piece.start,
      end: piece.end,
    }));
  });
}

function mergeHighlights(highlights: RangeHighlight[]): RangeHighlight[] {
  if (highlights.length === 0) {
    return [];
  }

  const sorted = [...highlights].sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    return a.end - b.end;
  });

  const merged: RangeHighlight[] = [];

  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ ...current });
      continue;
    }

    const hasSameStyle =
      last.colorId === current.colorId &&
      last.customColor === current.customColor &&
      last.customFontColor === current.customFontColor;
    const canMerge = current.start <= last.end + 1;

    if (hasSameStyle && canMerge) {
      last.end = Math.max(last.end, current.end);
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

function rangesFromVerseNumbers(verseNumbers: number[]): VerseRange[] {
  if (verseNumbers.length === 0) {
    return [];
  }

  const sorted = [...verseNumbers].sort((a, b) => a - b);
  const ranges: VerseRange[] = [];

  let rangeStart = sorted[0]!;
  let rangeEnd = sorted[0]!;

  for (let i = 1; i < sorted.length; i += 1) {
    const verseNumber = sorted[i]!;

    if (verseNumber <= rangeEnd + 1) {
      rangeEnd = verseNumber;
      continue;
    }

    ranges.push({
      start: rangeStart,
      end: rangeEnd,
    });

    rangeStart = verseNumber;
    rangeEnd = verseNumber;
  }

  ranges.push({
    start: rangeStart,
    end: rangeEnd,
  });

  return ranges;
}

function normalizeHighlights(
  highlights: ChapterHighlight[]
): ChapterHighlight[] {
  let normalized: RangeHighlight[] = [];

  // Later entries take precedence over earlier ones, then adjacent equal styles are merged.
  for (const highlight of highlights) {
    const incoming = toRangeHighlight(highlight);
    normalized = removeRangeFromHighlights(normalized, {
      start: incoming.start,
      end: incoming.end,
    });
    normalized.push(incoming);
    normalized = mergeHighlights(normalized);
  }

  return normalized.map(fromRangeHighlight);
}

/**
 * Reactive API for reading and mutating chapter highlights.
 *
 * Highlights are keyed by `translationId/bookId/chapterNumber`, cached in
 * signals, normalized for overlap/merge correctness, and persisted per user.
 */
export interface HighlightsManager {
  /**
   * Gets a reactive view of one chapter's highlights for the current account.
   *
   * The view tracks the signed-in account: if the account changes, the view
   * updates to that account's highlights (loading them if needed) without
   * the caller having to call this again. While signed out it reads the
   * highlights saved on this device.
   */
  getChapterHighlights: (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ) => ReadonlySignal<ChapterHighlights>;

  /**
   * Replaces and persists highlights for a chapter.
   *
   * Input highlights are normalized before being cached/stored.
   */
  saveChapterHighlights: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    highlights: ChapterHighlight[]
  ) => Promise<void>;

  /**
   * Adds or updates highlight styling for a single verse or range.
   */
  highlightVerse: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    highlightDetails: ChapterHighlight
  ) => Promise<void>;

  /**
   * Adds or updates highlight styling for a set of verse numbers.
   */
  highlightVerses: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseNumbers: number[],
    highlightDetails: Omit<ChapterHighlight, "verse">
  ) => Promise<void>;

  /**
   * Removes highlights from a single verse or range.
   */
  unhighlightVerse: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseDetails: Verse
  ) => Promise<void>;

  /**
   * Removes highlights from a set of verse numbers.
   */
  unhighlightVerses: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseNumbers: number[]
  ) => Promise<void>;

  /** Pushes locally-recorded highlight changes to the server. */
  sync: RecordSyncManager<ChapterHighlights>;
}

export interface CreateHighlightsManagerOptions {
  /**
   * Where highlights are recorded before they reach the server.
   *
   * Defaults to IndexedDB. Pass an explicit store to inject a fake in tests,
   * or null to switch local storage off — which is also what happens on its
   * own during SSR and wherever the browser blocks storage, since the
   * IndexedDB factory returns null there. With no store, writes go straight
   * to the server and signed-out writes are dropped with a warning.
   */
  store?: OfflineRecordStore<ChapterHighlights> | null;
}

function createChapterHighlightsAddress(
  translationId: string,
  bookId: string,
  chapterNumber: number
): string {
  return `${HIGHLIGHTS_ADDRESS_PREFIX}${translationId}/${bookId}/${chapterNumber}`;
}

const emptyChapterHighlights: ChapterHighlights = {
  highlights: [],
};

type ChapterHighlightsEntry = {
  /** Account these highlights belong to, or {@link LOCAL_OWNER} while signed out. */
  owner: string;
  /** Latest known highlights for this owner + chapter. */
  data: Signal<ChapterHighlights>;
  /** True once a load or a save has put real highlights in `data`. */
  settled: boolean;
  /** In-flight load, shared by concurrent readers and mutators. */
  load: Promise<void> | null;
};

function entryKey(owner: string, address: string): string {
  return `${owner} ${address}`;
}

/**
 * Creates the highlights manager.
 *
 * Behavior summary:
 * - Reads and writes a local store first, so highlighting works signed out
 *   and offline, and hands the queued changes to the record sync engine.
 * - Caches chapter highlights in reactive signals, keyed by owner and
 *   chapter address. Keying by owner is what keeps one user's highlights
 *   from ever being served to another after switching accounts, since a
 *   response for one account can only ever land on that account's own entry.
 * - Loads chapter data lazily on first access per owner + address.
 * - Returned views track the signed-in account, so switching accounts
 *   updates every view in place without callers re-requesting them.
 * - Normalizes overlapping highlight ranges to deterministic output.
 * - Writes for the owner a mutation read from rather than for whoever is
 *   signed in by the time the write starts.
 */
export function createHighlightsManager(
  os: CasualOSManager,
  login: LoginManager,
  options: CreateHighlightsManagerOptions = {}
): HighlightsManager {
  const store =
    options.store === undefined
      ? createIndexedDbRecordStore<ChapterHighlights>(
          highlightsSyncDomain.dbName
        )
      : options.store;

  // Cached highlights, keyed by owner + chapter address.
  const entries = new Map<string, ChapterHighlightsEntry>();
  // Identity-stable per-chapter views handed to callers, keyed by address.
  // Never pruned on account switch (unlike `entries`): evicting a view would
  // mint a new computed on the next call, breaking that identity for callers
  // still holding the old one.
  const views = new Map<string, ReadonlySignal<ChapterHighlights>>();

  /** The bucket rows belong to: the signed-in account, or the signed-out one. */
  const currentOwner = (): string => login.userId.value ?? LOCAL_OWNER;

  const getOrCreateEntry = (
    owner: string,
    address: string
  ): ChapterHighlightsEntry => {
    const key = entryKey(owner, address);
    let entry = entries.get(key);
    if (!entry) {
      entry = {
        owner,
        data: signal<ChapterHighlights>(emptyChapterHighlights),
        settled: false,
        load: null,
      };
      entries.set(key, entry);
    }
    return entry;
  };

  const applyPayload = (
    entry: ChapterHighlightsEntry,
    payload: ChapterHighlights | null
  ): void => {
    entry.data.value = payload
      ? { highlights: normalizeHighlights(payload.highlights) }
      : emptyChapterHighlights;
    entry.settled = true;
  };

  /** Reads the server's copy; null when it has none. Rejects when unreachable. */
  const fetchFromServer = async (
    owner: string,
    address: string
  ): Promise<ChapterHighlights | null> => {
    const result = await os.getData(owner, address);
    if (!result || !result.success) {
      if (!result || result.errorCode === "data_not_found") {
        return null;
      }
      throw new Error(`Failed to load highlights: ${result.errorCode}`);
    }

    const parsed = highlightsSyncDomain.parse(result.data);
    if (!parsed) {
      // The address holds something that isn't chapter highlights, which can
      // neither be shown nor edited, so it reads as nothing being there.
      console.warn("Failed to parse chapter highlights:", result.data);
    }
    return parsed;
  };

  const loadChapterHighlights = async (
    owner: string,
    address: string,
    entry: ChapterHighlightsEntry
  ): Promise<void> => {
    if (!store) {
      // No local storage: the server is the only source, and a signed-out
      // reader has none.
      if (owner === LOCAL_OWNER) {
        applyPayload(entry, null);
        return;
      }

      let fromServer: ChapterHighlights | null = null;
      try {
        fromServer = await fetchFromServer(owner, address);
      } catch (error) {
        console.warn("Failed to load chapter highlights:", error);
      }
      // Anything that settled the entry while this request was in the air
      // holds newer highlights than this response does.
      if (!entry.settled) {
        applyPayload(entry, fromServer);
      }
      return;
    }

    const local = await store.get(owner, address);
    if (local) {
      applyPayload(entry, local.deleted ? null : local.payload);
    }

    // Signed-out rows have no server side, and offline there is nothing to ask.
    const canReachServer = owner !== LOCAL_OWNER && sync.isOnline.value;
    if (!canReachServer) {
      if (!local) {
        applyPayload(entry, null);
      }
      return;
    }

    try {
      const fromServer = await fetchFromServer(owner, address);
      // Leaves a pending row alone; the sync pass merges it. Otherwise takes
      // the server's copy.
      await store.reconcileCollection(
        owner,
        address,
        fromServer ? [{ address, payload: fromServer }] : [],
        Date.now()
      );
    } catch (error) {
      // Couldn't refresh. The mirror holds whatever we last knew, which is
      // strictly better than reporting the chapter as empty.
      console.warn("Failed to refresh highlights from the server.", error);
    }

    // Re-read rather than trusting the response: a save that landed during the
    // round trip is in the store as a pending row and is the newer truth.
    const row = await store.get(owner, address);
    applyPayload(entry, row && !row.deleted ? row.payload : null);
  };

  // Starts (or awaits an existing) load for an entry. Does not write any
  // signal synchronously: this is called during computed evaluation, and a
  // computed must not have side effects visible before its own value settles.
  const ensureLoaded = (
    owner: string,
    address: string,
    entry: ChapterHighlightsEntry
  ): Promise<void> | null => {
    if (entry.settled) {
      return entry.load;
    }
    if (!entry.load) {
      entry.load = loadChapterHighlights(owner, address, entry).finally(() => {
        entry.load = null;
      });
    }
    return entry.load;
  };

  const getOrCreateView = (
    address: string
  ): ReadonlySignal<ChapterHighlights> => {
    let view = views.get(address);
    if (!view) {
      view = computed(() => {
        const owner = currentOwner(); // the dependency that keeps this view following the account
        const entry = getOrCreateEntry(owner, address);
        void ensureLoaded(owner, address, entry);
        return entry.data.value;
      });
      views.set(address, view);
    }
    return view;
  };

  // Drops every cached entry that no longer belongs to the current owner, so
  // signing back in re-reads instead of serving a stale entry left over from a
  // previous session as that same account.
  let cachedOwner: string | undefined;
  effect(() => {
    const owner = currentOwner();
    if (owner === cachedOwner) {
      return;
    }
    cachedOwner = owner;
    for (const [key, entry] of entries) {
      if (entry.owner !== owner) {
        entries.delete(key);
      }
    }
  });

  const getChapterHighlights = (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ): ReadonlySignal<ChapterHighlights> => {
    const address = createChapterHighlightsAddress(
      translationId,
      bookId,
      chapterNumber
    );
    const view = getOrCreateView(address);

    // Kick the load eagerly so callers see fresh data as soon as possible,
    // without subscribing this call site to account changes (the view
    // itself carries that dependency for whoever reads it).
    const owner = login.userId.peek() ?? LOCAL_OWNER;
    void ensureLoaded(owner, address, getOrCreateEntry(owner, address));

    return view;
  };

  // Writes a chapter's highlights for the owner the entry belongs to, rather
  // than for whoever happens to be signed in when the write starts. Callers
  // that merged into existing highlights resolved an owner to read from, and
  // the write has to go to that same owner: an account switch part-way
  // through a mutation would otherwise store one account's highlights in
  // another account's record.
  const writeChapterHighlights = async (
    entry: ChapterHighlightsEntry,
    address: string,
    highlights: ChapterHighlight[]
  ): Promise<void> => {
    if (!store && entry.owner === LOCAL_OWNER) {
      // Nothing can hold this: no local storage, and no account to record it
      // under. Showing it anyway would leave a highlight on screen that looks
      // saved and is gone on the next load.
      console.warn(
        "Unable to save highlights: signed out with no local storage."
      );
      return;
    }

    const normalized = normalizeHighlights(highlights);

    // Optimistically update local state before waiting for persistence.
    applyPayload(entry, { highlights: normalized });

    const payload = chapterHighlightsSchema.parse({
      highlights: normalized,
    });

    if (!store) {
      await os.recordData(entry.owner, address, payload, {
        marker: highlightsSyncDomain.marker(address, payload),
      });
      return;
    }

    const existing = await store.get(entry.owner, address);
    await store.put({
      key: recordKey(entry.owner, address),
      owner: entry.owner,
      address,
      collection: address,
      payload,
      // Keep the server version this edit was built on, so a second offline
      // edit is still judged against what the server actually holds.
      base: existing?.base ?? null,
      deleted: false,
      updatedAtMs: Date.now(),
      pendingOp: "upsert",
      attempts: 0,
    });
    sync.notifyLocalChange();
  };

  const saveChapterHighlights = async (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    highlights: ChapterHighlight[]
  ): Promise<void> => {
    const address = createChapterHighlightsAddress(
      translationId,
      bookId,
      chapterNumber
    );
    const owner = currentOwner();

    await writeChapterHighlights(
      getOrCreateEntry(owner, address),
      address,
      highlights
    );
  };

  // The current owner's entry for a chapter, loaded, for mutations that merge
  // into existing highlights rather than replace them. The entry also carries
  // the owner the merged result must be written back to, so pass it to
  // `writeChapterHighlights` rather than resolving the owner a second time.
  //
  // Resolved with `peek`, before the load is awaited, so an account switch
  // mid-load can't send one account's highlights to another's record (#1564).
  const resolveEntryToMutate = async (
    address: string
  ): Promise<ChapterHighlightsEntry> => {
    const owner = login.userId.peek() ?? LOCAL_OWNER;
    const entry = getOrCreateEntry(owner, address);
    await ensureLoaded(owner, address, entry);
    return entry;
  };

  const sync = createRecordSyncManager<ChapterHighlights>({
    os,
    login,
    store,
    domain: highlightsSyncDomain,
    onSynced: (address, payload, owner) =>
      applyPayload(getOrCreateEntry(owner, address), payload),
    onRemoved: (address, owner) =>
      applyPayload(getOrCreateEntry(owner, address), null),
  });

  const highlightVerse = async (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    highlightDetails: ChapterHighlight
  ): Promise<void> => {
    const nextHighlight = chapterHighlightSchema.parse(highlightDetails);
    const range = toVerseRange(nextHighlight.verse);
    const verseNumbers = Array.from(
      { length: range.end - range.start + 1 },
      (_, index) => range.start + index
    );

    await highlightVerses(translationId, bookId, chapterNumber, verseNumbers, {
      colorId: nextHighlight.colorId,
      customColor: nextHighlight.customColor,
      customFontColor: nextHighlight.customFontColor,
    });
  };

  const highlightVerses = async (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseNumbers: number[],
    highlightDetails: Omit<ChapterHighlight, "verse">
  ): Promise<void> => {
    const parsedStyle = highlightStyleSchema.parse(highlightDetails);
    const parsedVerseNumbers = verseNumbersSchema.parse(verseNumbers);
    const deduplicatedVerseNumbers = Array.from(new Set(parsedVerseNumbers));

    if (deduplicatedVerseNumbers.length === 0) {
      return;
    }

    const address = createChapterHighlightsAddress(
      translationId,
      bookId,
      chapterNumber
    );

    const entry = await resolveEntryToMutate(address);

    const targetRanges = rangesFromVerseNumbers(deduplicatedVerseNumbers);
    let updated = entry.data.value.highlights.map(toRangeHighlight);

    for (const range of targetRanges) {
      updated = removeRangeFromHighlights(updated, range);
      updated.push({
        start: range.start,
        end: range.end,
        colorId: parsedStyle.colorId,
        customColor: parsedStyle.customColor,
        customFontColor: parsedStyle.customFontColor,
      });
    }

    await writeChapterHighlights(
      entry,
      address,
      mergeHighlights(updated).map(fromRangeHighlight)
    );
  };

  const unhighlightVerse = async (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseDetails: Verse
  ): Promise<void> => {
    const verse = verseSchema.parse(verseDetails);
    const removeRange = toVerseRange(verse);
    const verseNumbers = Array.from(
      { length: removeRange.end - removeRange.start + 1 },
      (_, index) => removeRange.start + index
    );

    await unhighlightVerses(translationId, bookId, chapterNumber, verseNumbers);
  };

  const unhighlightVerses = async (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseNumbers: number[]
  ): Promise<void> => {
    const parsedVerseNumbers = verseNumbersSchema.parse(verseNumbers);
    const deduplicatedVerseNumbers = Array.from(new Set(parsedVerseNumbers));

    if (deduplicatedVerseNumbers.length === 0) {
      return;
    }

    const address = createChapterHighlightsAddress(
      translationId,
      bookId,
      chapterNumber
    );

    const entry = await resolveEntryToMutate(address);

    const coversAnyVerse = deduplicatedVerseNumbers.some((verseNumber) =>
      entry.data.value.highlights.some((highlight) =>
        highlightContainsVerse(highlight, verseNumber)
      )
    );
    if (!coversAnyVerse) {
      return;
    }

    const targetRanges = rangesFromVerseNumbers(deduplicatedVerseNumbers);
    let updated = entry.data.value.highlights.map(toRangeHighlight);

    for (const range of targetRanges) {
      updated = removeRangeFromHighlights(updated, range);
    }

    await writeChapterHighlights(
      entry,
      address,
      mergeHighlights(updated).map(fromRangeHighlight)
    );
  };

  return {
    getChapterHighlights,
    saveChapterHighlights,
    highlightVerse,
    highlightVerses,
    unhighlightVerse,
    unhighlightVerses,
    sync,
  };
}

type HighlightStyle = Omit<ChapterHighlight, "verse">;

function stylesByVerse(
  payload: ChapterHighlights | null
): Map<number, HighlightStyle> {
  const styles = new Map<number, HighlightStyle>();
  if (!payload) {
    return styles;
  }
  for (const highlight of normalizeHighlights(payload.highlights)) {
    const { start, end } = toVerseRange(highlight.verse);
    for (let verse = start; verse <= end; verse++) {
      styles.set(verse, {
        colorId: highlight.colorId,
        customColor: highlight.customColor,
        customFontColor: highlight.customFontColor,
      });
    }
  }
  return styles;
}

function sameStyle(
  a: HighlightStyle | undefined,
  b: HighlightStyle | undefined
): boolean {
  return canonicalize(a ?? null) === canonicalize(b ?? null);
}

/**
 * Three-way merge of one chapter's highlights, per verse.
 *
 * A verse this device did not touch (local equals base) takes whatever the
 * server has, present or absent. A verse it did touch keeps the local value,
 * including a removal. No clocks are involved, so two devices never disagree
 * about the outcome, and there is never anything to ask the user.
 */
export function mergeChapterHighlights(
  base: ChapterHighlights | null,
  local: ChapterHighlights | null,
  server: ChapterHighlights | null
): ChapterHighlights {
  const baseStyles = stylesByVerse(base);
  const localStyles = stylesByVerse(local);
  const serverStyles = stylesByVerse(server);
  const verses = [
    ...new Set([
      ...baseStyles.keys(),
      ...localStyles.keys(),
      ...serverStyles.keys(),
    ]),
  ].sort((a, b) => a - b);

  const merged: ChapterHighlight[] = [];
  for (const verse of verses) {
    const style = sameStyle(localStyles.get(verse), baseStyles.get(verse))
      ? serverStyles.get(verse)
      : localStyles.get(verse);
    if (style) {
      merged.push({ ...style, verse });
    }
  }
  return { highlights: normalizeHighlights(merged) };
}

const HIGHLIGHTS_ADDRESS_PREFIX = "highlights:";

function translationIdFromAddress(address: string): string {
  return address.slice(HIGHLIGHTS_ADDRESS_PREFIX.length).split("/")[0] ?? "";
}

export const highlightsSyncDomain: SyncDomain<ChapterHighlights> = {
  dbName: "seed-bible-highlights",
  parse: (value) => {
    const parsed = chapterHighlightsSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  },
  sameVersion: (a, b) =>
    canonicalize(normalizeHighlights(a.highlights)) ===
    canonicalize(normalizeHighlights(b.highlights)),
  // The chapter is the record, so it is its own collection.
  collection: (address) => address,
  marker: (address) =>
    `publicRead:highlights/${translationIdFromAddress(address)}`,
  merge: mergeChapterHighlights,
};
