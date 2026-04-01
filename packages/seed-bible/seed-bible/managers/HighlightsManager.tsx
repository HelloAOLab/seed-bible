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
  color: z.string().min(1),
  fontColor: z.string().min(1),
  verse: verseSchema,
});

export const chapterHighlightsSchema = z.object({
  highlights: z.array(chapterHighlightSchema),
});

export type ChapterHighlight = z.infer<typeof chapterHighlightSchema>;
export type ChapterHighlights = z.infer<typeof chapterHighlightsSchema>;

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

    return parsed.data;
  };

  const saveChapterHighlights = async (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    highlights: ChapterHighlight[]
  ): Promise<void> => {
    if (!login.userId.value) {
      await login.login();
      return;
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
    const payload = chapterHighlightsSchema.parse({ highlights });

    await os.recordData(userId, address, payload);
  };

  return {
    getChapterHighlights,
    saveChapterHighlights,
  };
}
