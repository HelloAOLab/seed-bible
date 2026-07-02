import type { HistoryManager } from "ext_discover.interfaces.managers.HistoryManager";
import type { PlayingPlaylistId } from "ext_discover.models.playlist";

export interface HistoryProps {
  id: string;
  manager?: HistoryManager;
  playingPlaylist?: PlayingPlaylistId;
}
