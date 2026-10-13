import type { PlaylistPageSeed } from "../managers/PlaylistManager";
import type { ReadingPlanPageSeed } from "../managers/ReadingPlansManager";
import { readInjectedJsonObject } from "./injectedJson";

/**
 * Reads the SSR playlist-page load the host server injected (see
 * `entry-ssr.tsx`'s `<!-- PLAYLIST_PAGE_JSON -->` placeholder), so the
 * client's `PlaylistManager` doesn't re-fetch a playlist the page already
 * shows.
 */
export function readInjectedPlaylistPageSeed(): PlaylistPageSeed | undefined {
  return readInjectedJsonObject<PlaylistPageSeed>("app-playlist-page-seed");
}

/** Same as `readInjectedPlaylistPageSeed`, for a shared reading plan page. */
export function readInjectedReadingPlanPageSeed():
  | ReadingPlanPageSeed
  | undefined {
  return readInjectedJsonObject<ReadingPlanPageSeed>(
    "app-reading-plan-page-seed"
  );
}
