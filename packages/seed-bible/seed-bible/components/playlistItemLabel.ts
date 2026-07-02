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
      const { bookId, chapter, verse, endVerse } = item.ref;
      const book = resolveBookName(bookId);
      return endVerse
        ? `${book} ${chapter}:${verse}-${endVerse}`
        : `${book} ${chapter}:${verse}`;
    }
    case "link":
      return item.url;
    case "html":
      return t("playlist-item-html", { defaultValue: "HTML snippet" });
  }
}
