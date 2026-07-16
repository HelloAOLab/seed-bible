import type { useI18n } from "../i18n/I18nManager";
import type { Playlist } from "../managers/PlaylistManager";

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
    case "bible-verse": {
      const { bookId, chapter, verse, endVerse, endChapter, toEndOfChapter } =
        item.ref;
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
    case "link":
      return item.title?.trim() || item.url;
    case "html":
      return (
        item.title?.trim() ||
        t("playlist-item-html", { defaultValue: "HTML snippet" })
      );
  }
}
