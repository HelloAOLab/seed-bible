import type { DiscoverContext } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import discoveredContentData from "./discoveredContent.json";

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
