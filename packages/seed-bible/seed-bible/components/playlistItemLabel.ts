import type { useI18n } from "../i18n/I18nManager";
import type { Playlist, VerseRef } from "../managers/PlaylistManager";

/** "Genesis 16:7-13", "John 1-3", "Genesis 1": a reference as readers write it. */
export function verseRefLabel(
  ref: VerseRef,
  resolveBookName: (bookId: string) => string
): string {
  const { bookId, chapter, verse, endVerse, endChapter, toEndOfChapter } = ref;
  const book = resolveBookName(bookId);
  // No verse means whole chapters are referenced: "Genesis 1" or, with an
  // end chapter, a range like "John 1-3".
  if (verse == null) {
    return endChapter
      ? `${book} ${chapter}-${endChapter}`
      : `${book} ${chapter}`;
  }
  if (endChapter != null && endVerse != null) {
    return `${book} ${chapter}:${verse}-${endChapter}:${endVerse}`;
  }
  // A queue fragment synthesized for a cross-chapter range whose actual
  // end verse isn't known here (it's resolved during navigation).
  if (toEndOfChapter) {
    return `${book} ${chapter}:${verse}-end`;
  }
  return endVerse
    ? `${book} ${chapter}:${verse}-${endVerse}`
    : `${book} ${chapter}:${verse}`;
}

/** Characters of a question's prompt used as its label when it has no title. */
const PROMPT_LABEL_MAX_LENGTH = 80;

/**
 * Renders a single playlist item as a plain-text label. Shared by the playlist
 * editor and the play view so both label items identically.
 */
export function playlistItemLabel(
  item: Playlist["items"][number],
  t: ReturnType<typeof useI18n>["t"],
  resolveBookName: (bookId: string) => string
): string {
  switch (item.type) {
    case "bible-verse":
      // A passage with a titled note goes by that title, as the author named
      // the step; the reference is its subtitle then.
      return (
        item.noteTitle?.trim() ||
        [item.ref, ...(item.refs ?? [])]
          .map((ref) => verseRefLabel(ref, resolveBookName))
          .join(" · ")
      );
    case "link":
      return item.title?.trim() || item.preview?.title || item.url;
    case "html":
      return (
        item.title?.trim() ||
        t("playlist-item-html", { defaultValue: "HTML snippet" })
      );
    case "question": {
      const title = item.title?.trim();
      if (title) {
        return title;
      }
      const prompt = item.prompt.trim();
      return prompt.length > PROMPT_LABEL_MAX_LENGTH
        ? `${prompt.slice(0, PROMPT_LABEL_MAX_LENGTH).trimEnd()}…`
        : prompt || t("playlist-item-question", { defaultValue: "Question" });
    }
    case "compare":
      return (
        item.title?.trim() ||
        item.refs.map((ref) => verseRefLabel(ref, resolveBookName)).join(" · ")
      );
    case "scene":
      return (
        item.title.trim() || t("playlist-item-scene", { defaultValue: "Scene" })
      );
  }
}
