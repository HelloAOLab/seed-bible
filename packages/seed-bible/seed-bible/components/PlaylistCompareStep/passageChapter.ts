import type { TranslationBookChapter } from "../../managers/FreeUseBibleAPI";
import { passageVerses, type VerseRef } from "../../managers/PlaylistManager";

/**
 * `chapter` cut down to the verses `ref` covers, with any heading or break
 * directly above its first verse. The whole chapter when `ref` is the whole
 * chapter, and no content when `ref` isn't in this chapter at all.
 */
export function passageChapter(
  chapter: TranslationBookChapter,
  ref: VerseRef
): TranslationBookChapter {
  const inChapter =
    ref.bookId === chapter.book.id && ref.chapter === chapter.chapter.number;
  const span = inChapter
    ? passageVerses(ref, {
        bookId: chapter.book.id,
        chapter: chapter.chapter.number,
        numberOfVerses: chapter.numberOfVerses,
      })
    : null;
  if (inChapter && !span) {
    return chapter;
  }
  const entries = chapter.chapter.content;
  const isInSpan = (entry: (typeof entries)[number]) =>
    !!span &&
    entry.type === "verse" &&
    entry.number >= span.start &&
    entry.number <= span.end;
  const first = entries.findIndex(isInSpan);
  if (first < 0) {
    return { ...chapter, chapter: { ...chapter.chapter, content: [] } };
  }
  let start = first;
  while (start > 0 && entries[start - 1]!.type !== "verse") {
    start--;
  }
  let last = first;
  entries.forEach((entry, index) => {
    if (isInSpan(entry)) {
      last = index;
    }
  });
  return {
    ...chapter,
    chapter: { ...chapter.chapter, content: entries.slice(start, last + 1) },
  };
}
