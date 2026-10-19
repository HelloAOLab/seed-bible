import type { useI18n } from "../i18n/I18nManager";
import type { Playlist } from "../managers/PlaylistManager";
import { resolveLinkMedia } from "../managers/resolveLinkMedia";
import { htmlExcerpt, linkHost } from "./ReadingPlansPane/readingPreview";

/**
 * What kind of item this is, as the reader sees it: Scripture, Text, Link, or
 * Video for a link that plays one.
 */
export function playlistItemKind(
  item: Playlist["items"][number],
  t: ReturnType<typeof useI18n>["t"]
): string {
  switch (item.type) {
    case "bible-verse":
      return t("playlist-add-mode-scripture", { defaultValue: "Scripture" });
    case "html":
      return t("playlist-add-mode-text", { defaultValue: "Text" });
    case "link":
      return resolveLinkMedia(item.url).kind === "link"
        ? t("playlist-add-mode-link", { defaultValue: "Link" })
        : t("reading-plan-link-video", { defaultValue: "Video" });
  }
}

/**
 * The secondary line under an item's title in the playlist editor and queue:
 * the kind of item, then what it holds where the title doesn't already say
 * so. A scripture item's title is its reference, so it gets the kind alone;
 * text gets an excerpt; a link gets its host.
 */
export function playlistItemSubtitle(
  item: Playlist["items"][number],
  t: ReturnType<typeof useI18n>["t"]
): string {
  const kind = playlistItemKind(item, t);
  switch (item.type) {
    case "bible-verse":
      return kind;
    case "html": {
      const excerpt = htmlExcerpt(item.html);
      return excerpt ? `${kind} · ${excerpt}` : kind;
    }
    case "link":
      return `${kind} · ${linkHost(item.url)}`;
  }
}
