import type { PlaylistPageSeed } from "../managers/PlaylistManager";

/**
 * Reads the SSR playlist-page load the host server injected as a JSON
 * `<script>` tag (see `entry-ssr.tsx`'s `<!-- PLAYLIST_PAGE_JSON -->`
 * placeholder and `PlaylistManager.getPlaylistPageSeed`), so the client's
 * `PlaylistManager` doesn't re-fetch a playlist the page already shows.
 */
export function readInjectedPlaylistPageSeed(): PlaylistPageSeed | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const el = document.getElementById("app-playlist-page-seed");
  if (!el?.textContent) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(el.textContent);
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch (error) {
    console.error("PLAYLIST PAGE SEED JSON PARSE FAILED:", error);
    return undefined;
  }
}
