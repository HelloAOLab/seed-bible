import { effect, signal } from "@preact/signals";
import type { PlaylistListManager } from "ext_discover.interfaces.managers.PlaylistListManager";
import type { DragOverSet } from "ext_discover.models.playlistList";
import type { PlayingPlaylistId } from "ext_discover.models.playlist";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, PlaylistListManager>();

export function getPlaylistListManager(scope: string): PlaylistListManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createPlaylistListManager(scope);
  managersByScope.set(scope, manager);
  return manager;
}

export function createPlaylistListManager(scope: string): PlaylistListManager {
  const playlistLoading = signal(!!G.IsPlaylistLoading);
  const draggedItemID = signal<string | null>(null);
  const openedList = signal<string | false>(false);
  const dragOverSet = signal<DragOverSet>({
    position: "Top",
    itemId: "null",
  });
  const toggle = signal(false);

  let toBeSetItems: Record<string, unknown>[] | null = null;
  const parentIdCtx = signal(scope);
  const playingPlaylistCtx = signal<PlayingPlaylistId>(false);

  const setPlaylistLoading = (value: boolean) => {
    playlistLoading.value = value;
  };

  const setOpenedList = (
    value: string | false | ((prev: string | false) => string | false)
  ) => {
    openedList.value =
      typeof value === "function" ? value(openedList.value) : value;
  };

  const setToggle = (value: boolean) => {
    toggle.value = value;
  };

  const setDragoverSet = (newState: DragOverSet) => {
    if (newState.itemId !== dragOverSet.value.itemId) {
      dragOverSet.value = newState;
    }
  };

  const syncContext = (ctx: {
    parentId: string;
    playingPlaylist: PlayingPlaylistId;
  }) => {
    parentIdCtx.value = ctx.parentId;
    playingPlaylistCtx.value = ctx.playingPlaylist;
  };

  const handleDragStart = (
    index: number,
    playLists: Record<string, unknown>[]
  ) => {
    toBeSetItems = playLists;
    draggedItemID.value = playLists[index]?.id as string;
  };

  const handleDragOver = (
    index: number,
    playLists: Record<string, unknown>[]
  ) => {
    if (!draggedItemID.value) return;

    const draggedItemIndex = playLists.findIndex(
      (hist) => hist.id === draggedItemID.value
    );
    const draggedOverItem = playLists[index];
    const dragItem = [playLists[draggedItemIndex]];

    if (dragItem[0]?.id === draggedOverItem?.id) {
      toBeSetItems = playLists;
      setDragoverSet({
        itemId: "null",
        position: "Top",
      });
      return;
    }

    setDragoverSet({
      itemId: draggedOverItem.id as string,
      position: draggedItemIndex < index ? "Bottom" : "Top",
    });

    const filterAbleItems: Record<string, boolean> = {
      [draggedItemID.value]: true,
    };
    const newItems = playLists.filter(
      (hist) => !filterAbleItems[hist.id as string]
    );
    newItems.splice(index, 0, ...dragItem);
    toBeSetItems = newItems;
  };

  const handleDragEnd = (
    playLists: Record<string, unknown>[],
    setPlayLists: (
      value:
        | Record<string, unknown>[]
        | ((prev: Record<string, unknown>[]) => Record<string, unknown>[])
    ) => void,
    mergeMode: boolean
  ) => {
    if (mergeMode) {
      const dragItemIndex = playLists.findIndex(
        (ele) => ele.id === draggedItemID.value
      );
      const dragOverItemIndex = playLists.findIndex(
        (ele) => ele.id === dragOverSet.value.itemId
      );

      if (
        dragOverItemIndex > -1 &&
        dragItemIndex > -1 &&
        dragItemIndex !== dragOverItemIndex
      ) {
        setPlayLists((prev) => {
          const old = [...prev];
          const oldItem = old[dragItemIndex];
          const target = old[dragOverItemIndex] as Record<string, unknown> & {
            list: Record<string, unknown>[];
            nesting: number;
          };
          target.list.push({
            type: "playlist",
            ...oldItem,
          });
          target.nesting += 1;
          old.splice(dragItemIndex, 1);
          return old;
        });
      }
    } else if (toBeSetItems) {
      setPlayLists(toBeSetItems);
    }

    setDragoverSet({
      itemId: "null",
      position: "Top",
    });
    draggedItemID.value = null;
  };

  effect(() => {
    G.SetPlaylistLoading = setPlaylistLoading;
    return () => {
      G.SetPlaylistLoading = null;
    };
  });

  effect(() => {
    if (!playingPlaylistCtx.value) return;

    const parentId = parentIdCtx.value;
    toggle.value;
    openedList.value;

    G[`${parentId}ToggleGreyCheckPLayingPlaylist`] = setToggle;
    G[`${parentId}SetOpenedList`] = setOpenedList;

    return () => {
      G[`${parentId}SetOpenedList`] = null;
      G[`${parentId}ToggleGreyCheckPLayingPlaylist`] = null;
    };
  });

  return {
    playlistLoading,
    draggedItemID,
    openedList,
    dragOverSet,
    toggle,
    setPlaylistLoading,
    setOpenedList,
    setToggle,
    syncContext,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
