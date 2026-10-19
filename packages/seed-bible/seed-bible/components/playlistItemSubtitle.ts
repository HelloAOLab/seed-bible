import type { useI18n } from "../i18n/I18nManager";
import type { Playlist } from "../managers/PlaylistManager";
import { resolveLinkMedia } from "../managers/resolveLinkMedia";
import { htmlExcerpt, linkHost } from "./ReadingPlansPane/readingPreview";

/**
 * The secondary line under an item's title in the playlist editor: the kind
 * of item, then what it holds where the title doesn't already say so. A
 * scripture item's title is its reference, so it gets the kind alone; text
 * gets an excerpt; a link gets its host, and a video link says so.
 */
export function playlistItemSubtitle(
  item: Playlist["items"][number],
  t: ReturnType<typeof useI18n>["t"]
): string {
  switch (item.type) {
    case "bible-verse":
      return t("playlist-add-mode-scripture", { defaultValue: "Scripture" });
    case "html": {
      const kind = t("playlist-add-mode-text", { defaultValue: "Text" });
      const excerpt = htmlExcerpt(item.html);
      return excerpt ? `${kind} · ${excerpt}` : kind;
    }
    case "link": {
      const kind =
        resolveLinkMedia(item.url).kind === "link"
          ? t("playlist-add-mode-link", { defaultValue: "Link" })
          : t("reading-plan-link-video", { defaultValue: "Video" });
      return `${kind} · ${linkHost(item.url)}`;
    }
  }
}
