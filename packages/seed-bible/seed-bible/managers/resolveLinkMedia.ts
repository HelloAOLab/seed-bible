/**
 * How a `link` playlist item should be presented, decided from its URL:
 * - `video`: a direct video file — render in a `<video>` element.
 * - `embed`: a known video site (YouTube, Vimeo) — render `url` (already the
 *   site's embed URL) in an `<iframe>`.
 * - `link`: anything else — show the URL with an "Open" button.
 */
export type LinkMedia =
  | { kind: "video"; url: string }
  | { kind: "embed"; url: string }
  | { kind: "link"; url: string };

// File extensions browsers can play natively in a <video> element.
const VIDEO_FILE_EXTENSIONS = [".mp4", ".m4v", ".webm", ".ogv", ".ogg", ".mov"];

// YouTube video ids are drawn from this alphabet; used to reject junk paths.
const YOUTUBE_ID = /^[\w-]+$/;

/**
 * Classifies a link URL so the play view knows how to render it. Falls back to
 * a plain link for anything unrecognized or unparseable.
 */
export function resolveLinkMedia(rawUrl: string): LinkMedia {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: "link", url: rawUrl };
  }

  // Prefer a known embeddable site over the extension check: a site URL never
  // ends in a video extension, but checking embeds first keeps intent clear.
  const embed = toEmbedUrl(url);
  if (embed) {
    return { kind: "embed", url: embed };
  }

  const path = url.pathname.toLowerCase();
  if (VIDEO_FILE_EXTENSIONS.some((ext) => path.endsWith(ext))) {
    return { kind: "video", url: rawUrl };
  }

  return { kind: "link", url: rawUrl };
}

/**
 * Rewrites a known video-site watch URL into its embeddable player URL, or
 * returns `null` when the URL isn't a recognized video page.
 */
function toEmbedUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com"
  ) {
    // Standard watch page: youtube.com/watch?v=ID
    if (url.pathname === "/watch") {
      return youTubeEmbed(url.searchParams.get("v"), url);
    }
    // Path-style ids: /shorts/ID, /live/ID, /embed/ID, /v/ID
    const [prefix, id] = url.pathname.split("/").filter(Boolean);
    if (
      id &&
      (prefix === "shorts" ||
        prefix === "live" ||
        prefix === "embed" ||
        prefix === "v")
    ) {
      return youTubeEmbed(id, url);
    }
    return null;
  }

  if (host === "youtu.be") {
    const [id] = url.pathname.split("/").filter(Boolean);
    return youTubeEmbed(id ?? null, url);
  }

  if (host === "vimeo.com") {
    const [id] = url.pathname.split("/").filter(Boolean);
    return id && /^\d+$/.test(id)
      ? `https://player.vimeo.com/video/${id}`
      : null;
  }
  if (host === "player.vimeo.com") {
    // Already an embed URL.
    return url.toString();
  }

  return null;
}

/**
 * Builds a YouTube embed URL for the given video id, carrying over a start time
 * (`t` or `start`) when present. Returns `null` for a missing/invalid id.
 */
function youTubeEmbed(id: string | null, source: URL): string | null {
  if (!id || !YOUTUBE_ID.test(id)) {
    return null;
  }
  const embed = new URL(`https://www.youtube.com/embed/${id}`);
  const start =
    source.searchParams.get("start") ??
    parseTimeParam(source.searchParams.get("t"));
  if (start) {
    embed.searchParams.set("start", start);
  }
  return embed.toString();
}

/**
 * Parses a YouTube `t` value into whole seconds. Accepts plain seconds ("90",
 * "90s") and colon/unit forms ("1m30s", "1h2m3s"). Returns `null` when empty or
 * unrecognized.
 */
function parseTimeParam(value: string | null): string | null {
  if (!value) {
    return null;
  }
  if (/^\d+s?$/.test(value)) {
    return value.replace(/s$/, "");
  }
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match || !match[0]) {
    return null;
  }
  const [, h, m, s] = match;
  const seconds = Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
  return seconds > 0 ? String(seconds) : null;
}
