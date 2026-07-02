import type { PlayingPlaylistManager } from "ext_discover.interfaces.managers.PlayingPlaylistManager";

export interface PlaylistQueueContainerProps {
  manager: PlayingPlaylistManager;
  name: string;
  list: any[];
  broken?: boolean;
  playlistID?: string;
  id: string;
  isLayers?: boolean;
  queueKeyName: string;
  index: number;
}
