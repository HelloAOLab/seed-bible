const TRACKING_PARAMS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "si"]);

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);

function youTubeVideoId(url: URL, host: string): string | null {
  if (host === "youtu.be") {
    return url.pathname.slice(1).split("/")[0] || null;
  }
  if (!YOUTUBE_HOSTS.has(host)) {
    return null;
  }
  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }
  const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/);
  return match?.[1] ?? null;
}

/**
 * A key that's the same for two links to the same page, used to skip a link
 * already in the library. Ignores the scheme, `www.`, a trailing slash, the
 * fragment and tracking parameters, and maps every form of a YouTube video
 * link to one key. Null for anything that isn't an http(s) link.
 */
export function normalizeContentUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const videoId = youTubeVideoId(url, host);
  if (videoId) {
    return `youtube:${videoId}`;
  }
  for (const name of [...url.searchParams.keys()]) {
    if (name.startsWith("utm_") || TRACKING_PARAMS.has(name)) {
      url.searchParams.delete(name);
    }
  }
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "";
  const search = url.searchParams.toString();
  return `${host}${url.port ? `:${url.port}` : ""}${path}${search ? `?${search}` : ""}`;
}
