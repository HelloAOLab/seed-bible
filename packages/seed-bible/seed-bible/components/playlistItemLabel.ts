import type { useI18n } from "../i18n/I18nManager";
import type { Playlist, VerseRef } from "../managers/PlaylistManager";

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
      return item.compare
        ? t("playlist-compare-label", {
            first: passageLabel(item.ref, resolveBookName),
            second: passageLabel(item.compare.ref, resolveBookName),
            defaultValue: "Compare {{first}} to {{second}}",
          })
        : passageLabel(item.ref, resolveBookName);
    case "link":
      return item.title?.trim() || item.preview?.title || item.url;
    case "html":
      return (
        item.title?.trim() ||
        (item.question
          ? t("playlist-step-question", { defaultValue: "Question" })
          : t("playlist-item-html", { defaultValue: "HTML snippet" }))
      );
  }
}

/** A passage as a plain-text label, e.g. "Genesis 1:3-5" or "John 1-3". */
export function passageLabel(
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
