import { z } from "zod";
import type { LoginManager } from "seed-bible.managers.LoginManager";
import { signal, type Signal } from "@preact/signals";

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
   * Gets a reactive signal for one chapter's highlights.
   *
   * If unauthenticated, returns an empty signal value.
   */
  getChapterHighlights: (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ) => Signal<ChapterHighlights>;

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

/**
 * Creates the highlights manager.
 *
 * Behavior summary:
 * - Caches chapter highlights in reactive signals.
 * - Loads chapter data lazily on first access per address.
 * - Normalizes overlapping highlight ranges to deterministic output.
 * - Persists highlights under user-scoped storage keys.
 */
export function createHighlightsManager(
  login: LoginManager
): HighlightsManager {
  // Cache highlights by chapter address in reactive signals.
  const highlightsCache = new Map<string, Signal<ChapterHighlights>>();
  const inFlightLoads = new Map<string, Promise<void>>();
  const loadedAddresses = new Set<string>();

  const getOrCreateChapterHighlightsSignal = (
    address: string
  ): Signal<ChapterHighlights> => {
    let chapterHighlights = highlightsCache.get(address);
    if (!chapterHighlights) {
      chapterHighlights = signal<ChapterHighlights>(emptyChapterHighlights);
      highlightsCache.set(address, chapterHighlights);
    }

    return chapterHighlights;
  };

  const awaitChapterLoad = async (address: string): Promise<void> => {
    const inFlightLoad = inFlightLoads.get(address);
    if (inFlightLoad) {
      await inFlightLoad;
    }
  };

  const loadChapterHighlights = async (
    userId: string,
    address: string,
    chapterHighlightsSignal: Signal<ChapterHighlights>
  ): Promise<void> => {
    const data = await os.getData(userId, address);

    if (!data || !data.success || !data.data) {
      chapterHighlightsSignal.value = emptyChapterHighlights;
      loadedAddresses.add(address);
      return;
    }

    const parsed = chapterHighlightsSchema.safeParse(data.data);
    if (!parsed.success) {
      console.warn("Failed to parse chapter highlights:", parsed.error);
      chapterHighlightsSignal.value = emptyChapterHighlights;
      loadedAddresses.add(address);
      return;
    }

    chapterHighlightsSignal.value = {
      highlights: normalizeHighlights(parsed.data.highlights),
    };
    loadedAddresses.add(address);
  };

  const getChapterHighlights = (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ): Signal<ChapterHighlights> => {
    const address = createChapterHighlightsAddress(
      translationId,
      bookId,
      chapterNumber
    );
    const chapterHighlightsSignal = getOrCreateChapterHighlightsSignal(address);

    const userId = login.userId.value;
    if (!userId) {
      chapterHighlightsSignal.value = emptyChapterHighlights;
      loadedAddresses.delete(address);
      return chapterHighlightsSignal;
    }

    if (!loadedAddresses.has(address) && !inFlightLoads.has(address)) {
      const loadPromise = loadChapterHighlights(
        userId,
        address,
        chapterHighlightsSignal
      ).finally(() => {
        inFlightLoads.delete(address);
      });
      inFlightLoads.set(address, loadPromise);
    }

    return chapterHighlightsSignal;
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
    const chapterHighlightsSignal = getOrCreateChapterHighlightsSignal(address);
    const normalized = normalizeHighlights(highlights);

    // Optimistically update local state before waiting for persistence.
    chapterHighlightsSignal.value = {
      highlights: normalized,
    };
    loadedAddresses.add(address);

    if (!login.userId.value) {
      await login.login();
    }

    const userId = login.userId.value;
    if (!userId) {
      console.warn("Unable to save highlights: user is not authenticated.");
      return;
    }

    const payload = chapterHighlightsSchema.parse({
      highlights: normalized,
    });

    await os.recordData(userId, address, payload, {
      marker: `publicRead:highlights/${translationId}`,
    });
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

    const current = getChapterHighlights(translationId, bookId, chapterNumber);
    const address = createChapterHighlightsAddress(
      translationId,
      bookId,
      chapterNumber
    );
    await awaitChapterLoad(address);

    const targetRanges = rangesFromVerseNumbers(deduplicatedVerseNumbers);
    let updated = current.value.highlights.map(toRangeHighlight);

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

    await saveChapterHighlights(
      translationId,
      bookId,
      chapterNumber,
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

    const current = getChapterHighlights(translationId, bookId, chapterNumber);
    const address = createChapterHighlightsAddress(
      translationId,
      bookId,
      chapterNumber
    );
    await awaitChapterLoad(address);

    const targetRanges = rangesFromVerseNumbers(deduplicatedVerseNumbers);
    let updated = current.value.highlights.map(toRangeHighlight);

    for (const range of targetRanges) {
      updated = removeRangeFromHighlights(updated, range);
    }

    await saveChapterHighlights(
      translationId,
      bookId,
      chapterNumber,
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
