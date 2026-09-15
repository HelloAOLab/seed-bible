import type { DiscoverContext } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import { z } from "zod";
import discoveredContentData from "./discoveredContent.json";
import bibleProjectData from "./bibleProject.json";

export const BibleProjectSchema = z.array(
  z.object({
    book: z.string(),
    book_id: z.number(),
    chapter_start: z.number(),
    chapter_end: z.number(),
    timecode: z.object({
      start: z.string(),
      start_seconds: z.number(),
      end: z.string(),
      end_seconds: z.number(),
      duration: z.string(),
    }),
    video: z.object({
      id: z.number(),
      title: z.string(),
      description: z.string(),
      duration_seconds: z.number(),
      color: z.string(),
      share_url: z.string(),
      images: z.object({
        mini: z.string(),
        small: z.string(),
        medium: z.string(),
        large: z.string(),
      }),
      paths: z.object({
        mp4: z.string(),
      }),
      category: z.object({
        id: z.number(),
        label: z.string(),
        title: z.string(),
        share_url: z.string(),
      }),
      aspect_ratio: z.number(),
    }),
    section_title: z.string(),
  })
);

export type BibleProjectData = z.infer<typeof BibleProjectSchema>;
export type BibleProjectItem = BibleProjectData[number];

export const BOOK_ID_TO_USFM: Map<number, string> = new Map([
  [1, "GEN"],
  [2, "EXO"],
  [3, "LEV"],
  [4, "NUM"],
  [5, "DEU"],
  [6, "JOS"],
  [7, "JDG"],
  [8, "RUT"],
  [9, "1SA"],
  [10, "2SA"],
  [11, "1KI"],
  [12, "2KI"],
  [13, "1CH"],
  [14, "2CH"],
  [15, "EZR"],
  [16, "NEH"],
  [17, "EST"],
  [18, "JOB"],
  [19, "PSA"],
  [20, "PRO"],
  [21, "ECC"],
  [22, "SNG"],
  [23, "ISA"],
  [24, "JER"],
  [25, "LAM"],
  [26, "EZK"],
  [27, "DAN"],
  [28, "HOS"],
  [29, "JOL"],
  [30, "AMO"],
  [31, "OBA"],
  [32, "JON"],
  [33, "MIC"],
  [34, "NAM"],
  [35, "HAB"],
  [36, "ZEP"],
  [37, "HAG"],
  [38, "ZEC"],
  [39, "MAL"],
  [40, "MAT"],
  [41, "MRK"],
  [42, "LUK"],
  [43, "JHN"],
  [44, "ACT"],
  [45, "ROM"],
  [46, "1CO"],
  [47, "2CO"],
  [48, "GAL"],
  [49, "EPH"],
  [50, "PHP"],
  [51, "COL"],
  [52, "1TH"],
  [53, "2TH"],
  [54, "1TI"],
  [55, "2TI"],
  [56, "TIT"],
  [57, "PHM"],
  [58, "HEB"],
  [59, "JAS"],
  [60, "1PE"],
  [61, "2PE"],
  [62, "1JN"],
  [63, "2JN"],
  [64, "3JN"],
  [65, "JUD"],
  [66, "REV"],
]);

/** Matches the shape `script/lib/discoveredContentList.ts` writes. */
export interface DiscoveredContentReference {
  book: string;
  chapter: number;
  endChapter?: number;
  verse?: number;
  endVerse?: number;
}

export interface DiscoveredContentItem {
  id: string;
  title: string;
  author: string;
  description: string;
  url: string;
  /** Preview image fetched from the link's metadata (e.g. `og:image`). Absent for older entries generated before link previews were added. */
  imageUrl?: string;
  references: DiscoveredContentReference[];
}

export const discoveredContent =
  discoveredContentData as DiscoveredContentItem[];

/** Whether `reference`'s book/chapter range covers the reader's current position. */
export function referenceCoversChapter(
  reference: DiscoveredContentReference,
  position: Pick<DiscoverContext, "book" | "chapter">
): boolean {
  if (reference.book !== position.book) {
    return false;
  }
  const endChapter = reference.endChapter ?? reference.chapter;
  return (
    position.chapter >= reference.chapter && position.chapter <= endChapter
  );
}

export interface DiscoveredContentMatch {
  item: DiscoveredContentItem;
  reference: DiscoveredContentReference;
}

/**
 * Every discovered-content item with a reference covering the reader's
 * current book/chapter, paired with the specific reference that matched (an
 * item with several references, e.g. one spanning two chapters, surfaces
 * once per chapter it's read in).
 */
export function findDiscoveredContentForChapter(
  position: Pick<DiscoverContext, "book" | "chapter">,
  items: DiscoveredContentItem[] = discoveredContent
): DiscoveredContentMatch[] {
  const matches: DiscoveredContentMatch[] = [];
  for (const item of items) {
    const reference = item.references.find((candidate) =>
      referenceCoversChapter(candidate, position)
    );
    if (reference) {
      matches.push({ item, reference });
    }
  }
  return matches;
}

let bibleProjectDataValidated: BibleProjectData | null = null;
export function getBibleProjectData(): BibleProjectData {
  if (!bibleProjectDataValidated) {
    bibleProjectDataValidated = BibleProjectSchema.parse(bibleProjectData);
  }
  return bibleProjectDataValidated;
}

export function findBibleProjectContentForChapter(context: DiscoverContext) {
  const data = getBibleProjectData();
  const content = [];
  for (const item of data) {
    const bookId = BOOK_ID_TO_USFM.get(item.book_id);
    if (!bookId) {
      console.warn(`Book ID ${item.book_id} not found in USFM mapping.`, item);
      continue;
    }

    if (bookId !== context.book) {
      continue;
    }

    const containsCurrentChapter =
      context.chapter >= item.chapter_start &&
      context.chapter <= item.chapter_end;
    if (!containsCurrentChapter) {
      console.warn("No match", { context, item });
      continue;
    }
    console.error("Match", { context, item });

    content.push({
      ...item,
      bookId,
      chapter: context.chapter,
    });
    // content.push({
    //   type: "content",
    //   title: item.section_title,
    //   description: item.video.description,
    //   reference: {
    //     book: bookId,
    //     chapter: item.chapter_start,
    //     endChapter: item.chapter_end,
    //   },
    //   content: <BibleProjectDataItemContent item={item} />,
    // });
  }
  return content;
}
