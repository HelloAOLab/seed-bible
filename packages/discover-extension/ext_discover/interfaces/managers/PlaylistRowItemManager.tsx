import type { Signal } from "@preact/signals";
import type { PlayingPlaylistId } from "ext_discover.models.playlist";
import type { DragOverSet } from "ext_discover.models.playlistList";

export interface PlaylistRowItemRowContext {
  id: string;
  parentId: string;
  name: string;
  list: Record<string, unknown>[];
  playListIndex: number;
  playListSubIndex?: number | null;
  playListSubId?: string | null;
  index?: number;
  attachment?: unknown;
  icon: string;
  isCustomIcon: boolean;
  color: string;
  isCustomColor: boolean;
  description: string;
  selectedTags?: unknown;
  access?: string;
  checklistEnabled?: boolean;
  readingPlanEnabled?: boolean;
  currentFormat?: string;
  isLayers?: boolean;
  shareProfileName?: string;
  totalItem?: number;
  creatingPlaylist?: boolean;
  viewOnly?: boolean;
  playingPlaylist?: PlayingPlaylistId;
  setPlaylists: (
    value:
      | Record<string, unknown>[]
      | ((prev: Record<string, unknown>[]) => Record<string, unknown>[])
  ) => void;
  setOpenedList: (
    value: string | false | ((prev: string | false) => string | false)
  ) => void;
  thisBot?: Record<string, unknown>;
}

export interface PlaylistRowItemManager {
  warningMessage: Signal<string | null>;
  showMoreOptions: Signal<boolean>;
  isPlay: Signal<boolean>;
  loading: Signal<boolean>;
  copyURL: Signal<string | null>;
  addToQueuePopup: Signal<boolean>;
  setWarningMessage: (value: string | null) => void;
  setShowMoreOptions: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsPlay: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setCopyURL: (value: string | null) => void;
  setAddToQueuePopup: (value: boolean) => void;
  onCloseWarningPopup: () => void;
  handleTouchStart: (e: { currentTarget: Element }) => void;
  handleTouchEnd: () => void;
  openContextMenu: (e: {
    preventDefault: () => void;
    currentTarget: Element;
  }) => void;
  setPlaylist: (
    ctx: PlaylistRowItemRowContext,
    newList: Record<string, unknown>[]
  ) => void;
  deleteDataFromPlaylist: (
    ctx: PlaylistRowItemRowContext,
    index: number | string[]
  ) => void;
  editDataFromPlaylist: (
    ctx: PlaylistRowItemRowContext,
    index: number | number[],
    isGroup: boolean,
    newVal?: boolean
  ) => void;
  deletePlayList: (ctx: PlaylistRowItemRowContext) => void;
  exportNestedList: (ctx: PlaylistRowItemRowContext) => void;
  hanldeAdd: (
    ctx: PlaylistRowItemRowContext,
    params: { dataItem: unknown; bulkAdd: boolean }
  ) => void;
  onClick: (
    ctx: PlaylistRowItemRowContext,
    params: { dataItem: unknown; bulkAdd: boolean; index: number }
  ) => void;
  copyClipBoard: (ctx: PlaylistRowItemRowContext) => Promise<void>;
  openMergeModal: (params: { id: string; parentId: string }) => void;
  onPlayPlaylist: (
    ctx: PlaylistRowItemRowContext,
    bypassQueue?: boolean
  ) => void;
  toggleOpen: (ctx: PlaylistRowItemRowContext) => void;
}
