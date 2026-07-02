import type { Signal } from "@preact/signals";
import type { DragOverSet } from "ext_discover.models.playlistList";
import type { PlayingPlaylistId } from "ext_discover.models.playlist";

export interface PlaylistListManager {
  playlistLoading: Signal<boolean>;
  draggedItemID: Signal<string | null>;
  openedList: Signal<string | false>;
  dragOverSet: Signal<DragOverSet>;
  toggle: Signal<boolean>;
  setPlaylistLoading: (value: boolean) => void;
  setOpenedList: (
    value: string | false | ((prev: string | false) => string | false)
  ) => void;
  setToggle: (value: boolean) => void;
  syncContext: (ctx: {
    parentId: string;
    playingPlaylist: PlayingPlaylistId;
  }) => void;
  handleDragStart: (
    index: number,
    playLists: Record<string, unknown>[]
  ) => void;
  handleDragOver: (index: number, playLists: Record<string, unknown>[]) => void;
  handleDragEnd: (
    playLists: Record<string, unknown>[],
    setPlayLists: (
      value:
        | Record<string, unknown>[]
        | ((prev: Record<string, unknown>[]) => Record<string, unknown>[])
    ) => void,
    mergeMode: boolean
  ) => void;
}
