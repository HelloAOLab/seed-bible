import type { useI18n } from "../i18n/I18nManager";
import type { Playlist } from "../managers/PlaylistManager";
import { resolveLinkMedia } from "../managers/resolveLinkMedia";
import { htmlExcerpt, linkHost } from "./ReadingPlansPane/readingPreview";
import { verseRefLabel } from "./playlistItemLabel";

/**
 * What kind of step this is, as the reader sees it: Scripture, Note +
 * Scripture when a passage carries a note, Note for a text step, Link, Video
 * for a link that plays one, Compare, Question, or Scene.
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
      return t("playlist-kind-note", { defaultValue: "Note" });
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

/** The Material Symbols icon that stands for a step's kind. */
export function playlistItemIcon(item: Playlist["items"][number]): string {
  switch (item.type) {
    case "bible-verse":
      return "menu_book";
    case "html":
      return "notes";
    case "link":
      return resolveLinkMedia(item.url).kind === "link"
        ? "link"
        : "play_circle";
    case "question":
      return "help";
    case "compare":
      return "compare_arrows";
    case "scene":
      return "bookmark";
  }
}

/** Roughly how long a reader spends on a step, in whole minutes (at least 1). */
export function playlistItemMinutes(item: Playlist["items"][number]): number {
  switch (item.type) {
    case "bible-verse": {
      const refs = [item.ref, ...(item.refs ?? [])];
      const verses = refs.reduce((sum, ref) => {
        if (ref.verse == null || ref.toEndOfChapter || ref.endChapter != null) {
          return sum + 16;
        }
        return sum + ((ref.endVerse ?? ref.verse) - ref.verse + 1);
      }, 0);
      const noteWords = item.note ? wordCount(item.note) : 0;
      return Math.max(1, Math.round(verses / 4 + noteWords / 180));
    }
    case "html":
      return (
        item.minutes ?? Math.max(1, Math.round(wordCount(item.html) / 180))
      );
    case "link":
      return (
        item.minutes ?? (resolveLinkMedia(item.url).kind === "link" ? 2 : 5)
      );
    case "question":
      return 2;
    case "compare":
      return 3;
    case "scene":
      return 0;
  }
}

/** The whole playlist's reading time, in minutes. */
export function playlistMinutes(items: Playlist["items"]): number {
  return items.reduce((sum, item) => sum + playlistItemMinutes(item), 0);
}

/** "{{count}} min", for a step or a whole playlist. */
export function minutesLabel(
  minutes: number,
  t: ReturnType<typeof useI18n>["t"]
): string {
  return t("playlist-minutes", {
    defaultValue: "{{count}} min",
    count: minutes,
  });
}

/** The queue's line under a step: its kind and about how long it takes. */
export function playlistItemQueueLine(
  item: Playlist["items"][number],
  t: ReturnType<typeof useI18n>["t"]
): string {
  return `${playlistItemKind(item, t)} · ${minutesLabel(playlistItemMinutes(item), t)}`;
}

function wordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").trim();
  return text ? text.split(/\s+/).length : 0;
}
