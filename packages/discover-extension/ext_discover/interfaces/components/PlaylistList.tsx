import type { DiscoverChipSelection } from "ext_discover.models.discover";
import type { PlayingPlaylistId } from "ext_discover.models.playlist";
import type { PlaylistListManager } from "ext_discover.interfaces.managers.PlaylistListManager";

export interface PlaylistListProps {
  scope?: string;
  parentId: string;
  selectedChip?: DiscoverChipSelection;
  extraActions?: () => void;
  mergeMode?: boolean;
  selectedPlaylists?: Record<string, boolean | string>;
  setSelectPlaylist?: (id: string, parentID: string) => void;
  selectPlaylist?: boolean;
  playLists: Record<string, unknown>[];
  setPlayLists: (
    value:
      | Record<string, unknown>[]
      | ((prev: Record<string, unknown>[]) => Record<string, unknown>[])
  ) => void;
  creatingPlaylist?: boolean;
  playingPlaylist?: PlayingPlaylistId;
  isLayers?: boolean;
  list?: PlaylistListManager;
}
