import { z } from "zod";
import type { LoginManager } from "seed-bible.managers.LoginManager";

const verseSchema = z.union([
  z.number().int().positive(),
  z
    .tuple([z.number().int().positive(), z.number().int().positive()])
    .refine(([start, end]) => start <= end, {
      message: "Verse range start must be less than or equal to end.",
    }),
]);

export const chapterHighlightSchema = z.object({
  colorId: z.string().min(1),
  verse: verseSchema,

  customColor: z.string().min(1).optional(),
  customFontColor: z.string().min(1).optional(),
});

export const chapterHighlightsSchema = z.object({
  highlights: z.array(chapterHighlightSchema),
});

export type Verse = z.infer<typeof verseSchema>;
export type ChapterHighlight = z.infer<typeof chapterHighlightSchema>;
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

export interface HighlightsManager {
  getChapterHighlights: (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ) => Promise<ChapterHighlights>;
  saveChapterHighlights: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    highlights: ChapterHighlight[]
  ) => Promise<void>;
  highlightVerse: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    highlightDetails: ChapterHighlight
  ) => Promise<void>;
  highlightVerses: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseNumbers: number[],
    highlightDetails: Omit<ChapterHighlight, "verse">
  ) => Promise<void>;
  unhighlightVerse: (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseDetails: Verse
  ) => Promise<void>;
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

export function createHighlightsManager(
  login: LoginManager
): HighlightsManager {
  const getChapterHighlights = async (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ): Promise<ChapterHighlights> => {
    const userId = login.userId.value;
    if (!userId) {
      return emptyChapterHighlights;
    }

    const address = createChapterHighlightsAddress(
      translationId,
      bookId,
      chapterNumber
    );
    const data = await os.getData(userId, address);

    if (!data) {
      return emptyChapterHighlights;
    }

    const parsed = chapterHighlightsSchema.safeParse(data);
    if (!parsed.success) {
      console.warn("Failed to parse chapter highlights:", parsed.error);
      return emptyChapterHighlights;
    }

    return {
      highlights: normalizeHighlights(parsed.data.highlights),
    };
  };

  const saveChapterHighlights = async (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    highlights: ChapterHighlight[]
  ): Promise<void> => {
    if (!login.userId.value) {
      await login.login();
    }

    const userId = login.userId.value;
    if (!userId) {
      console.warn("Unable to save highlights: user is not authenticated.");
      return;
    }

    const address = createChapterHighlightsAddress(
      translationId,
      bookId,
      chapterNumber
    );
    const payload = chapterHighlightsSchema.parse({
      highlights: normalizeHighlights(highlights),
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

    const current = await getChapterHighlights(
      translationId,
      bookId,
      chapterNumber
    );

    const targetRanges = rangesFromVerseNumbers(deduplicatedVerseNumbers);
    let updated = current.highlights.map(toRangeHighlight);

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
    if (!login.userId.value) {
      return;
    }

    const parsedVerseNumbers = verseNumbersSchema.parse(verseNumbers);
    const deduplicatedVerseNumbers = Array.from(new Set(parsedVerseNumbers));

    if (deduplicatedVerseNumbers.length === 0) {
      return;
    }

    const current = await getChapterHighlights(
      translationId,
      bookId,
      chapterNumber
    );

    const targetRanges = rangesFromVerseNumbers(deduplicatedVerseNumbers);
    let updated = current.highlights.map(toRangeHighlight);

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
