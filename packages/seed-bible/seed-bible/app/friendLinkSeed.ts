import type { FriendLinkSeed } from "../managers/FriendLinkPreviewLoader";
import { readInjectedJsonObject } from "./injectedJson";

/**
 * Reads the SSR `?addFriend=` profile load the host server injected (see
 * `entry-ssr.tsx`'s `<!-- FRIEND_LINK_JSON -->` placeholder), so the
 * client's friend link loader doesn't re-fetch it.
 */
export function readInjectedFriendLinkSeed(): FriendLinkSeed | undefined {
  return readInjectedJsonObject<FriendLinkSeed>("app-friend-link-seed");
}
