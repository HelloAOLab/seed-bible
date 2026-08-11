import type { useI18n } from "../../i18n/I18nManager";
import type { PlanReading } from "../../managers/ReadingPlansManager";
import { resolveLinkMedia } from "../../managers/resolveLinkMedia";
import { playlistItemIcon } from "../playlistItemIcon";

/**
 * Modal id used for previewing a reading-plan reading. Distinct from the
 * playlist playback modal so opening one never closes the other.
 */
export const PLAN_READING_PREVIEW_MODAL_ID = "reading-plan-item-preview";

/** Characters of a text reading shown inline before it is cut short. */
const EXCERPT_MAX_LENGTH = 120;

/** Cuts `text` to `maxLength`, preferring a word boundary, adding an ellipsis. */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  // Only break at a space if it isn't so early that we'd throw most of it away.
  const head = lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${head.trimEnd()}…`;
}

/**
 * A one-line plain-text excerpt of an HTML snippet, for showing what a text
 * reading says without rendering it. Tags are stripped rather than rendered —
 * the result is only ever used as text — and the whole thing is collapsed onto
 * one line and cut to `maxLength`, so a long snippet can't push the rest of the
 * list off the screen.
 */
export function htmlExcerpt(
  html: string,
  maxLength = EXCERPT_MAX_LENGTH
): string {
  const text = html
    // Drop elements whose contents were never visible text to begin with.
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    // Tags become spaces so words either side of a block boundary don't merge.
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    // `&amp;` last: decoding it first would turn "&amp;lt;" into "<".
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  return truncate(text, maxLength);
}

/**
 * Material Symbols name for a reading. Refines `playlistItemIcon` with the one
 * distinction this list cares about: a link that plays a video reads very
 * differently from one that opens a page, so it gets a play icon.
 */
export function readingItemIcon(item: PlanReading["item"]): string {
  if (item.type === "link" && resolveLinkMedia(item.url).kind !== "link") {
    return "play_circle";
  }
  return playlistItemIcon(item);
}

/** A link's host without "www.", or the raw URL when it doesn't parse. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * The secondary line shown under a reading's title, so the user can tell what a
 * reading holds without opening it: an excerpt for a text reading, and the kind
 * plus host for a link. Scripture returns null — its title is already the
 * reference, and there is nothing more to say about it here.
 */
export function readingPreviewText(
  item: PlanReading["item"],
  t: ReturnType<typeof useI18n>["t"]
): string | null {
  if (item.type === "html") {
    return htmlExcerpt(item.html) || null;
  }
  if (item.type === "link") {
    const host = linkHost(item.url);
    const media = resolveLinkMedia(item.url);
    return media.kind === "link"
      ? host
      : `${t("reading-plan-link-video", { defaultValue: "Video" })} · ${host}`;
  }
  return null;
}
