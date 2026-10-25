import { effect } from "@preact/signals";
import type { SeedBibleState } from "seed-bible";
import type { BibleReadingState } from "seed-bible/managers";
import { bookOrderIndex, orderedBookIds } from "./books";
import {
  bookOutOfRange,
  chapterOutOfRange,
  openSearchWindow,
  rangeHighlightCss,
  versesOutOfRange,
} from "./gameLogic";
import type { GameSignals } from "./types";

const RANGE_CLASS = "ftv-out-of-range";

function verseNumbers(content: unknown): number[] {
  if (!Array.isArray(content)) return [];
  const numbers: number[] = [];
  for (const node of content) {
    if (!node || typeof node !== "object") continue;
    const verse = node as { type?: unknown; number?: unknown };
    if (verse.type === "verse" && typeof verse.number === "number") {
      numbers.push(verse.number);
    }
  }
  return numbers;
}

/**
 * Greys books, chapters, and verses outside the current guess window, and
 * takes that grey back off when the round ends.
 */
export function watchSearchRange(
  state: SeedBibleState,
  game: GameSignals
): () => void {
  let styleEl: HTMLStyleElement | null = null;
  if (typeof document !== "undefined") {
    styleEl = document.createElement("style");
    document.head.appendChild(styleEl);
  }

  let painted: { reading: BibleReadingState; id: string } | null = null;
  let paintKey = "";
  let styleText = "";
  const clearPaint = () => {
    if (!painted) return;
    painted.reading.removeDecoration(painted.id);
    painted = null;
  };

  const dispose = effect(() => {
    const playing = game.phase.value === "playing";
    const window = playing ? game.searchWindow.value : openSearchWindow();
    const reading = state.app.selectedTab.value?.readingState;
    const bookId = reading?.bookId.value ?? null;
    const chapterNumber = reading?.chapterNumber.value ?? null;
    const content = reading?.chapterData?.value?.chapter?.content;
    // The verse list still belongs to the previous chapter until this flips.
    const contentStale = reading?.isChapterContentStale?.value ?? false;
    const catalog = reading?.translationBooks.value?.books;
    const openBook = state.selector?.bookData.value ?? null;

    const chapterCount = new Map<string, number>();
    for (const book of catalog ?? []) {
      if (book?.id && typeof book.numberOfChapters === "number") {
        chapterCount.set(book.id, book.numberOfChapters);
      }
    }

    const eliminatedBooks: string[] = [];
    if (playing) {
      for (const id of orderedBookIds()) {
        const index = bookOrderIndex(id);
        const count = chapterCount.get(id) ?? 150;
        if (bookOutOfRange(window, index, count)) eliminatedBooks.push(id);
      }
    }

    const eliminatedChapters: number[] = [];
    if (playing && openBook?.id) {
      const index = bookOrderIndex(openBook.id);
      const total =
        openBook.numberOfChapters || chapterCount.get(openBook.id) || 0;
      for (let chapter = 1; chapter <= total; chapter++) {
        if (chapterOutOfRange(window, index, chapter)) {
          eliminatedChapters.push(chapter);
        }
      }
    }

    if (styleEl) {
      const next = playing
        ? rangeHighlightCss(eliminatedBooks, eliminatedChapters)
        : "";
      if (next !== styleText) {
        styleEl.textContent = next;
        styleText = next;
      }
    }

    if (
      !playing ||
      !reading ||
      !bookId ||
      chapterNumber == null ||
      contentStale
    ) {
      clearPaint();
      paintKey = "";
      return;
    }

    const outside = versesOutOfRange(
      window,
      bookId,
      chapterNumber,
      verseNumbers(content)
    );
    const nextKey = `${bookId}\0${chapterNumber}\0${outside.join(",")}`;
    const samePaint =
      nextKey === paintKey &&
      (outside.length === 0 ? painted == null : painted?.reading === reading);
    if (samePaint) return;
    clearPaint();
    paintKey = nextKey;
    if (outside.length === 0) return;
    const id = reading.decorateVerses(bookId, chapterNumber, outside, {
      className: RANGE_CLASS,
    });
    painted = { reading, id };
  });

  return () => {
    dispose();
    clearPaint();
    styleEl?.remove();
    styleEl = null;
  };
}
