import "./PlayPlaylistView.css";
import type { TabsManager } from "../../managers/TabsManager";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
interface PlayPlaylistViewProps {
  playlists: PlaylistManager;
  tabs: TabsManager;
  modals: ModalManager;
  state: SeedBibleState;
}
/**
 * Playback screen shown inside the discover pane while a playlist is playing.
 * Displays the playlist title, the queue of items, and a bottom-anchored bar
 * with the current item and previous/next controls. Video, link, and text
 * (html) items open in the app's generic modal rather than rendering inline.
 */
export declare function PlayPlaylistView(
  props: PlayPlaylistViewProps
): import("preact").JSX.Element | null;
export {};
