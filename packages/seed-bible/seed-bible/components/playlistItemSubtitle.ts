import type { useI18n } from "../i18n/I18nManager";
import type { Playlist } from "../managers/PlaylistManager";
import { resolveLinkMedia } from "../managers/resolveLinkMedia";
import { htmlExcerpt, linkHost } from "./ReadingPlansPane/readingPreview";
import { verseRefLabel } from "./playlistItemLabel";

/**
 * What kind of step this is, as the reader sees it: Scripture, Note +
 * Scripture when a passage carries a note, Text, Link, Video for a link that
 * plays one, Compare, Question, or Scene.
 */
export function playlistItemKind(
  item: Playlist["items"][number],
  t: ReturnType<typeof useI18n>["t"]
): string {
  switch (item.type) {
    case "bible-verse":
      return item.note || item.noteTitle
        ? t("playlist-add-mode-note-scripture", {
            defaultValue: "Note + Scripture",
          })
        : t("playlist-add-mode-scripture", { defaultValue: "Scripture" });
    case "html":
      return t("playlist-add-mode-text", { defaultValue: "Text" });
    case "link":
      return resolveLinkMedia(item.url).kind === "link"
        ? t("playlist-add-mode-link", { defaultValue: "Link" })
        : t("reading-plan-link-video", { defaultValue: "Video" });
    case "question":
      return t("playlist-add-mode-question", { defaultValue: "Question" });
    case "compare":
      return t("playlist-add-mode-compare", { defaultValue: "Compare" });
    case "scene":
      return t("playlist-item-scene", { defaultValue: "Scene" });
  }
}

/**
 * The secondary line under an item's title in the playlist editor and queue:
 * the kind of step, then what it holds where the title doesn't already say
 * so. A scripture step's title is its reference, so it gets the kind alone,
 * or its note's title; text gets an excerpt; a link gets its host; a question
 * its prompt; a comparison its passages.
 */
export function playlistItemSubtitle(
  item: Playlist["items"][number],
  t: ReturnType<typeof useI18n>["t"],
  resolveBookName: (bookId: string) => string = (bookId) => bookId
): string {
  const kind = playlistItemKind(item, t);
  const withDetail = (detail: string | undefined) =>
    detail?.trim() ? `${kind} · ${detail.trim()}` : kind;
  switch (item.type) {
    case "bible-verse":
      return withDetail(
        item.noteTitle ||
          (item.refs?.length
            ? t("playlist-passage-count", {
                defaultValue: "{{count}} passages",
                count: item.refs.length + 1,
              })
            : undefined)
      );
    case "html":
      return withDetail(htmlExcerpt(item.html));
    case "link":
      return withDetail(linkHost(item.url));
    case "question":
      return item.title?.trim() ? withDetail(item.prompt) : kind;
    case "compare":
      return withDetail(
        item.refs.map((ref) => verseRefLabel(ref, resolveBookName)).join(" · ")
      );
    case "scene":
      return kind;
  }
}
