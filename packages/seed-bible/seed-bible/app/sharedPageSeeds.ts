import type { PlaylistPageSeed } from "../managers/PlaylistManager";
import type { ReadingPlanPageSeed } from "../managers/ReadingPlansManager";
import type { AppConfig } from "./appConfig";
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

/**
 * The shared-page seeds the server injected, but only when this very build
 * rendered the page. A page can be server-rendered by a different build than
 * the one running it in the browser: a preview branch is rendered by the
 * default branch's build (see `AppConfig.renderedByCommit`). That build parsed
 * the record with its own schema, which silently drops fields it doesn't know
 * — a scripture item's note, say — and validating the seed here can't bring
 * them back. Without a trusted seed, the managers load the record themselves.
 */
export function readTrustedSharedPageSeeds(
  config: Pick<AppConfig, "renderedByCommit">,
  clientCommit: string
): {
  playlist: PlaylistPageSeed | undefined;
  readingPlan: ReadingPlanPageSeed | undefined;
} {
  if (config.renderedByCommit !== clientCommit) {
    return { playlist: undefined, readingPlan: undefined };
  }
  return {
    playlist: readInjectedPlaylistPageSeed(),
    readingPlan: readInjectedReadingPlanPageSeed(),
  };
}
