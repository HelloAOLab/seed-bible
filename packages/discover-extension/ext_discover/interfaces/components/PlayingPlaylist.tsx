import type { PlayingPlaylistManager } from "ext_discover.interfaces.managers.PlayingPlaylistManager";

export interface PlayingPlaylistProps {
  manager: PlayingPlaylistManager;
  scope?: string;
}
