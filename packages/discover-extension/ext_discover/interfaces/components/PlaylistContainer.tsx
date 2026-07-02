import type { DiscoverChipSelection } from "ext_discover.models.discover";
import type { PlayingPlaylistId } from "ext_discover.models.playlist";
import type { PlaylistContainerManager } from "ext_discover.interfaces.managers.PlaylistContainerManager";

export interface PlaylistContainerProps {
  id: string;
  selectedChip: DiscoverChipSelection;
  query: string;
  setOpenModal: (value: boolean) => void;
  isLayers?: boolean;
  isCreate?: boolean;
  active?: boolean;
  playingPlaylist: PlayingPlaylistId;
  container?: PlaylistContainerManager;
}
