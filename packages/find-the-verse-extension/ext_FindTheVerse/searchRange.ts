import { effect } from "@preact/signals";
import type { SeedBibleState } from "seed-bible";
import type { BibleReadingState } from "seed-bible/managers";
import { bookOrderIndex, orderedBookIds } from "./books";
import {
  bookOutOfRange,
  chapterOutOfRange,
  openSearchWindow,
  rangeHighlightCss,
  ROUND_SCOPE_CLASS,
  versesOutOfRange,
} from "./gameLogic";
import { isRoundTabSelected, roundReading } from "./roundTab";
import type { GameSignals } from "./types";

const RANGE_CLASS = "ftv-out-of-range";
const SCOPE_DECORATION_ID = "find-the-verse-round-scope";

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
 * Greys books, chapters, and verses outside the current guess window in the
 * round's tab, and takes that grey back off when the round ends. All of it is
 * `localOnly`, though the round's tab is never a shared session anyway.
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
  let scoped: BibleReadingState | null = null;
  let scopeKey = "";
  let paintKey = "";
  let styleText = "";
  const clearPaint = () => {
    if (!painted) return;
    painted.reading.removeDecoration(painted.id);
    painted = null;
  };
  const clearScope = () => {
    scoped?.removeDecoration(SCOPE_DECORATION_ID);
    scoped = null;
    scopeKey = "";
  };

  const dispose = effect(() => {
    const reading = roundReading(state, game) ?? undefined;
    const playing = game.phase.value === "playing" && !!reading;
    const window = playing ? game.searchWindow.value : openSearchWindow();
    // The selector greys for whichever tab is on screen, so only the round's.
    const selectorIsRound = playing && isRoundTabSelected(state, game);
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
    if (selectorIsRound) {
      for (const id of orderedBookIds()) {
        const index = bookOrderIndex(id);
        const count = chapterCount.get(id) ?? 150;
        if (bookOutOfRange(window, index, count)) eliminatedBooks.push(id);
      }
    }

    const eliminatedChapters: number[] = [];
    if (selectorIsRound && openBook?.id) {
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

    if (!playing || !reading || !bookId || chapterNumber == null) {
      clearScope();
      clearPaint();
      paintKey = "";
      return;
    }

    const nextScopeKey = `${bookId}\0${chapterNumber}`;
    if (scoped !== reading || scopeKey !== nextScopeKey) {
      clearScope();
      reading.decorateVerses(
        bookId,
        chapterNumber,
        1,
        {
          containerClassName: ROUND_SCOPE_CLASS,
          preserveOnChapterChange: true,
          localOnly: true,
        },
        SCOPE_DECORATION_ID
      );
      scoped = reading;
      scopeKey = nextScopeKey;
    }

    if (contentStale) {
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
      localOnly: true,
    });
    painted = { reading, id };
  });

  return () => {
    dispose();
    clearScope();
    clearPaint();
    styleEl?.remove();
    styleEl = null;
  };
}
