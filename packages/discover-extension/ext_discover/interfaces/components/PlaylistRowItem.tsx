import type { PlayingPlaylistId } from "ext_discover.models.playlist";
import type { DragOverSet } from "ext_discover.models.playlistList";
import type { PlaylistRowItemManager } from "ext_discover.interfaces.managers.PlaylistRowItemManager";

export interface PlaylistRowItemProps {
  row?: PlaylistRowItemManager;
  currentDateActive?: unknown;
  shareProfileName?: string;
  oldItemsMap?: Record<string, unknown>;
  checkListData?: unknown;
  selectedPlaylists?: Record<string, boolean | string>;
  selectPlaylist?: boolean;
  setSelectPlaylist?: (id: string, parentID: string) => void;
  playlistParentName?: string;
  clickPass?: boolean;
  linkingMode?: boolean;
  onLink?: unknown;
  viewOnly?: boolean;
  parentId: string;
  playingPlaylist?: PlayingPlaylistId;
  checklistEnabled?: boolean;
  readingPlanEnabled?: boolean;
  totalItem?: number;
  index?: number;
  toggle?: boolean;
  list: Record<string, unknown>[];
  name: string;
  id: string;
  setPlaylists: (
    value:
      | Record<string, unknown>[]
      | ((prev: Record<string, unknown>[]) => Record<string, unknown>[])
  ) => void;
  attachment?: unknown;
  playListIndex: number;
  playListSubId?: string | null;
  playListSubIndex?: number | null;
  creatingPlaylist?: boolean;
  handleDragStart: (index: number) => void;
  handleDragOver: (index: number) => void;
  handleDragEnd: () => void;
  currentFormat?: string;
  dragOverSet: DragOverSet;
  setOpenedList: (
    value: string | false | ((prev: string | false) => string | false)
  ) => void;
  opendedList: string | false;
  color?: string;
  icon?: string;
  isCustomColor?: boolean;
  description?: string;
  isCustomIcon?: boolean;
  selectedTags?: unknown;
  isLayers?: boolean;
  access?: string;
  onSelectPlaylist?: ((id: string) => void) | null;
  isDeleteShow?: boolean;
  thisBot?: Record<string, unknown>;
}
