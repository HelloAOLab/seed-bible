// Shared helpers for displaying a reference and jumping the reader to it.

import { type SeedBibleState } from "seed-bible";

/**
 * Format an OSIS ref id for display: "GEN:1:3" -> "Gen 1:3".
 * Lowercases the book code, then capitalizes its first letter (so numbered
 * books read correctly too, e.g. "1CO:1:1" -> "1Co 1:1").
 */
export function fmtRef(ref: string): string {
  const [book, chapter, verse] = ref.split(":");
  const b = (book ?? "").toLowerCase().replace(/[a-z]/, (c) => c.toUpperCase());
  if (verse != null) return `${b} ${chapter}:${verse}`;
  if (chapter != null) return `${b} ${chapter}`;
  return b;
}

/** Navigate the active reader tab to a ref and briefly highlight the verse. */
export async function highlightVerse(
  seedBibleState: SeedBibleState,
  ref: string,
  interval = 5000
): Promise<void> {
  const [book, chapter, verse] = ref.split(":");

  const selectedTabId = seedBibleState.tabs.selectedTabId;
  const selectedTab = seedBibleState.tabs.tabs.value.find(
    (tab) => tab.id === selectedTabId.value
  );
  const currentReadingState = seedBibleState.app.currentReadingState.value;

  if (selectedTab && book) {
    await selectedTab.readingState.selectTranslationAndChapter(
      currentReadingState?.translationId || "ABB",
      book,
      Number(chapter) || 1,
      verse ? { scrollToVerse: Number(verse) } : {}
    );
    if (verse && chapter) {
      selectedTab.readingState.decorateVerses(
        book,
        Number(chapter),
        Number(verse),
        {
          className: "sb-verse-decoration-initial-verse-highlight",
          removeAfterMs: interval,
        }
      );
    }
  }
}
