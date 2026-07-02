import type { DiscoverChipSelection } from "ext_discover.models.discover";
import type { PlayingPlaylistId } from "ext_discover.models.playlist";
import type { PlaylistManager } from "ext_discover.interfaces.managers.PlaylistManager";
import type { PlaylistContainerManager } from "ext_discover.interfaces.managers.PlaylistContainerManager";

export interface PlaylistProps {
  id: string;
  query: string;
  selectedChip: DiscoverChipSelection;
  isCreate?: boolean;
  isLayers?: boolean;
  playingPlaylist: PlayingPlaylistId;
  creatingPlaylist: boolean;
  setCreatingPlaylist: PlaylistContainerManager["setCreatingPlaylist"];
  playlist: PlaylistManager;
  thisBot?: Record<string, unknown>;
}
