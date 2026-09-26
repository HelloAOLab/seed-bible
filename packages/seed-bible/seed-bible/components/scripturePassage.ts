import { extractContentText } from "../managers/ChapterText";
import type { TranslationBookChapter } from "../managers/FreeUseBibleAPI";
import type { PlaylistItemData } from "../managers/PlaylistManager";

type VerseRef = Extract<PlaylistItemData, { type: "bible-verse" }>["ref"];

export interface PassageVerse {
  number: number;
  text: string;
}

/**
 * The verses of `chapter` that a single-chapter `ref` points at, as plain text.
 * Expects a ref already split per chapter (see `expandCrossChapterItem`), so
 * `endChapter` is ignored: no verse means the whole chapter, `toEndOfChapter`
 * runs from `verse` to the last verse, and a missing `endVerse` means one verse.
 */
export function passageVerses(
  chapter: TranslationBookChapter,
  ref: VerseRef
): PassageVerse[] {
  const start = ref.verse ?? 1;
  const end =
    ref.verse == null || ref.toEndOfChapter
      ? Infinity
      : (ref.endVerse ?? ref.verse);

  const verses: PassageVerse[] = [];
  for (const content of chapter.chapter.content) {
    if (
      content.type === "verse" &&
      content.number >= start &&
      content.number <= end
    ) {
      verses.push({
        number: content.number,
        text: extractContentText(content.content),
      });
    }
  }
  return verses;
}
