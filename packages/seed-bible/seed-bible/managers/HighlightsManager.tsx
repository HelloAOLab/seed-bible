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
   * Gets a reactive view of one chapter's highlights for the signed-in account.
   *
   * The view tracks the signed-in account: if the account changes, the view
   * updates to that account's highlights (loading them if needed) without
   * the caller having to call this again. If unauthenticated, the view reads
   * as empty.
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
}

function createChapterHighlightsAddress(
  translationId: string,
  bookId: string,
  chapterNumber: number
): string {
  return `highlights:${translationId}/${bookId}/${chapterNumber}`;
}

const emptyChapterHighlights: ChapterHighlights = {
  highlights: [],
};

type ChapterHighlightsEntry = {
  /** Account these highlights belong to. */
  userId: string;
  /** Latest known highlights for this account + chapter. */
  data: Signal<ChapterHighlights>;
  /** True once a load or a save has put real highlights in `data`. */
  settled: boolean;
  /** In-flight load, shared by concurrent readers and mutators. */
  load: Promise<void> | null;
};

function entryKey(userId: string, address: string): string {
  return `${userId} ${address}`;
}

/**
 * Creates the highlights manager.
 *
 * Behavior summary:
 * - Caches chapter highlights in reactive signals, keyed by account and
 *   chapter address. Keying by account is what keeps one user's highlights
 *   from ever being served to another after switching accounts, since a
 *   response for one account can only ever land on that account's own entry.
 * - Loads chapter data lazily on first access per account + address.
 * - Returned views track the signed-in account, so switching accounts
 *   updates every view in place without callers re-requesting them.
 * - Normalizes overlapping highlight ranges to deterministic output.
 * - Persists highlights under user-scoped storage keys, writing to the account
 *   a mutation read from rather than to whoever is signed in by the time the
 *   write starts.
 */
export function createHighlightsManager(
  os: CasualOSManager,
  login: LoginManager
): HighlightsManager {
  // Cached highlights, keyed by account + chapter address.
  const entries = new Map<string, ChapterHighlightsEntry>();
  // Identity-stable per-chapter views handed to callers, keyed by address.
  // Never pruned on account switch (unlike `entries`): evicting a view would
  // mint a new computed on the next call, breaking that identity for callers
  // still holding the old one.
  const views = new Map<string, ReadonlySignal<ChapterHighlights>>();

  const getOrCreateEntry = (
    userId: string,
    address: string
  ): ChapterHighlightsEntry => {
    const key = entryKey(userId, address);
    let entry = entries.get(key);
    if (!entry) {
      entry = {
        userId,
        data: signal<ChapterHighlights>(emptyChapterHighlights),
        settled: false,
        load: null,
      };
      entries.set(key, entry);
    }
    return entry;
  };

  const loadChapterHighlights = async (
    userId: string,
    address: string,
    entry: ChapterHighlightsEntry
  ): Promise<void> => {
    const data = await os.getData(userId, address);

    // Anything that settled the entry while this request was in the air holds
    // newer highlights than this response does.
    if (entry.settled) {
      return;
    }

    if (!data || !data.success || !data.data) {
      entry.data.value = emptyChapterHighlights;
      entry.settled = true;
      return;
    }

    const parsed = chapterHighlightsSchema.safeParse(data.data);
    if (!parsed.success) {
      console.warn("Failed to parse chapter highlights:", parsed.error);
      entry.data.value = emptyChapterHighlights;
      entry.settled = true;
      return;
    }

    entry.data.value = {
      highlights: normalizeHighlights(parsed.data.highlights),
    };
    entry.settled = true;
  };

  // Starts (or awaits an existing) load for an entry. Does not write any
  // signal synchronously: this is called during computed evaluation, and a
  // computed must not have side effects visible before its own value settles.
  const ensureLoaded = (
    userId: string,
    address: string,
    entry: ChapterHighlightsEntry
  ): Promise<void> | null => {
    if (entry.settled) {
      return entry.load;
    }
    if (!entry.load) {
      entry.load = loadChapterHighlights(userId, address, entry).finally(() => {
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
        const userId = login.userId.value; // the dependency that keeps this view following the signed-in account
        if (!userId) {
          return emptyChapterHighlights;
        }
        const entry = getOrCreateEntry(userId, address);
        void ensureLoaded(userId, address, entry);
        return entry.data.value;
      });
      views.set(address, view);
    }
    return view;
  };

  // Drops every cached entry that no longer belongs to the signed-in
  // account, so signing back in re-reads from the server instead of serving
  // a stale entry left over from a previous session as that same account.
  let cachedUserId: string | null | undefined;
  effect(() => {
    const userId = login.userId.value;
    if (userId === cachedUserId) {
      return;
    }
    cachedUserId = userId;
    for (const [key, entry] of entries) {
      if (entry.userId !== userId) {
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
    const userId = login.userId.peek();
    if (userId) {
      const entry = getOrCreateEntry(userId, address);
      void ensureLoaded(userId, address, entry);
    }

    return view;
  };

  // Writes a chapter's highlights for the account the entry belongs to, rather
  // than for whoever happens to be signed in when the write starts. Callers
  // that merged into existing highlights resolved an account to read from, and
  // the write has to go to that same account: an account switch part-way
  // through a mutation would otherwise store one account's highlights in
  // another account's record.
  const writeChapterHighlights = async (
    entry: ChapterHighlightsEntry,
    address: string,
    translationId: string,
    highlights: ChapterHighlight[]
  ): Promise<void> => {
    const normalized = normalizeHighlights(highlights);

    // Optimistically update local state before waiting for persistence.
    entry.data.value = {
      highlights: normalized,
    };
    entry.settled = true;

    const payload = chapterHighlightsSchema.parse({
      highlights: normalized,
    });

    await os.recordData(entry.userId, address, payload, {
      marker: `publicRead:highlights/${translationId}`,
    });
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

    // Settling the account has to stay above the write: `login()` opens a
    // modal, and `writeChapterHighlights` applies the highlight optimistically.
    // Writing first left the highlight on screen behind the modal looking
    // saved, then quietly not saving when the prompt was dismissed.
    let userId = login.userId.value;
    if (!userId) {
      await login.login();
      userId = login.userId.value;
    }
    if (!userId) {
      console.warn("Unable to save highlights: user is not authenticated.");
      return;
    }

    await writeChapterHighlights(
      getOrCreateEntry(userId, address),
      address,
      translationId,
      highlights
    );
  };

  // Resolves the signed-in account (attempting login if needed) and returns
  // that account's entry for a chapter with its highlights loaded, or null if
  // the account could not be resolved. Used by mutations that merge into
  // existing highlights
  // rather than replace them: reading highlights while signed out would be
  // empty, and saving would then replace the signed-in account's real data
  // instead of merging into it. The entry also carries the account the merged
  // result must be written back to, so pass it to `writeChapterHighlights`
  // rather than resolving the account a second time.
  const resolveEntryToMutate = async (
    address: string
  ): Promise<ChapterHighlightsEntry | null> => {
    let userId = login.userId.value;
    if (!userId) {
      await login.login();
      userId = login.userId.value;
    }
    if (!userId) {
      console.warn("Unable to save highlights: user is not authenticated.");
      return null;
    }

    const entry = getOrCreateEntry(userId, address);
    await ensureLoaded(userId, address, entry);
    return entry;
  };

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
    if (!entry) {
      return;
    }

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
      translationId,
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

    // Resolves the account like `resolveEntryToMutate`, but never prompts: a
    // signed-out user has no saved highlights, so there is nothing to remove
    // and a login modal would buy nothing. Clearing a session's broadcast
    // highlight hits this — it lives in the shared document, not in anybody's
    // records.
    //
    // Resolved once, before the load is awaited, and reused for the write
    // below, so an account switch mid-load can't send one account's highlights
    // to another's record (#1564).
    const userId = login.userId.peek();
    if (!userId) {
      return;
    }

    const entry = getOrCreateEntry(userId, address);
    await ensureLoaded(userId, address, entry);

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
      translationId,
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
  };
}
