import type { useI18n } from "../../i18n/I18nManager";
import type {
  PlaylistItemData,
  VerseRef,
} from "../../managers/PlaylistManager";
import { resolveLinkMedia } from "../../managers/resolveLinkMedia";
import { playlistItemLabel } from "../playlistItemLabel";

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * What a step is to the editor. Stored items only come in three types; a
 * question is a note with a `question` field, a compare is scripture with a
 * `compare` field, and video/audio are links to that kind of media.
 */
export type PlaylistStepKind =
  | "scripture"
  | "compare"
  | "note"
  | "question"
  | "video"
  | "audio"
  | "link";

const AUDIO_FILE_EXTENSIONS = [".mp3", ".m4a", ".aac", ".ogg", ".oga", ".wav"];

export function playlistStepKind(item: PlaylistItemData): PlaylistStepKind {
  switch (item.type) {
    case "bible-verse":
      return item.compare ? "compare" : "scripture";
    case "html":
      return item.question ? "question" : "note";
    case "link": {
      // A new video step has no link yet; it's still a video step.
      if (!item.url) {
        return "video";
      }
      const media = resolveLinkMedia(item.url);
      if (media.kind === "embed" || media.kind === "video") {
        return "video";
      }
      let path = "";
      try {
        path = new URL(item.url).pathname.toLowerCase();
      } catch {
        // Not a URL yet; treated as a plain link.
      }
      return AUDIO_FILE_EXTENSIONS.some((ext) => path.endsWith(ext))
        ? "audio"
        : "link";
    }
  }
}

/** The step kind's name, as shown in the step list and the card's eyebrow. */
export function playlistStepKindName(
  kind: PlaylistStepKind,
  t: Translate
): string {
  switch (kind) {
    case "scripture":
      return t("playlist-step-scripture", { defaultValue: "Scripture" });
    case "compare":
      return t("playlist-step-compare", { defaultValue: "Compare" });
    case "note":
      return t("playlist-step-note", { defaultValue: "Note" });
    case "question":
      return t("playlist-step-question", { defaultValue: "Question" });
    case "video":
      return t("playlist-step-video", { defaultValue: "Video" });
    case "audio":
      return t("playlist-step-audio", { defaultValue: "Audio" });
    case "link":
      return t("playlist-step-link", { defaultValue: "Link" });
  }
}

/** Plain text of a stored HTML snippet, for labels. */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** A step's name in the step list. */
export function playlistStepLabel(
  item: PlaylistItemData,
  t: Translate,
  resolveBookName: (bookId: string) => string
): string {
  const kind = playlistStepKind(item);
  switch (kind) {
    case "scripture":
      return playlistItemLabel(item, t, resolveBookName);
    case "compare":
      return (
        (item.type === "bible-verse" && item.noteTitle?.trim()) ||
        t("playlist-step-compare-label", { defaultValue: "Compare verses" })
      );
    case "question":
    case "note": {
      if (item.type !== "html") {
        return "";
      }
      return (
        item.title?.trim() ||
        htmlToText(item.html) ||
        playlistStepKindName(kind, t)
      );
    }
    case "video":
    case "audio":
    case "link":
      return item.type === "link" && (item.title?.trim() || item.preview?.title)
        ? playlistItemLabel(item, t, resolveBookName)
        : item.type === "link" && item.url
          ? item.url
          : playlistStepKindName(kind, t);
  }
}

/** Minutes a step is expected to take; one when the author hasn't said. */
export function playlistStepMinutes(item: PlaylistItemData): number {
  return item.minutes ?? 1;
}

/** Minutes the whole playlist is expected to take. */
export function playlistTotalMinutes(items: readonly PlaylistItemData[]) {
  return items.reduce((sum, item) => sum + playlistStepMinutes(item), 0);
}

/** A verse reference as readers see it, e.g. "Genesis 1:3–5". */
export function formatVerseRef(
  ref: VerseRef,
  resolveBookName: (bookId: string) => string
): string {
  const book = resolveBookName(ref.bookId);
  if (ref.verse == null) {
    return ref.endChapter
      ? `${book} ${ref.chapter}–${ref.endChapter}`
      : `${book} ${ref.chapter}`;
  }
  if (ref.endChapter != null && ref.endVerse != null) {
    return `${book} ${ref.chapter}:${ref.verse}–${ref.endChapter}:${ref.endVerse}`;
  }
  return ref.endVerse
    ? `${book} ${ref.chapter}:${ref.verse}–${ref.endVerse}`
    : `${book} ${ref.chapter}:${ref.verse}`;
}

/** Escapes plain text for an HTML snippet. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
