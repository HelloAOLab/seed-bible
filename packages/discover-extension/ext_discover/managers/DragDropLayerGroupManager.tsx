import { effect, signal } from "@preact/signals";
import type {
  DragDropLayerGroupAutoOpenContext,
  DragDropLayerGroupManager,
} from "ext_discover.interfaces.managers.DragDropLayerGroupManager";

const G = globalThis as Record<string, any>;

const managersByItemId = new Map<string, DragDropLayerGroupManager>();

export function getDragDropLayerGroupManager(
  itemId: string
): DragDropLayerGroupManager {
  const existing = managersByItemId.get(itemId);
  if (existing) return existing;

  const manager = createDragDropLayerGroupManager(itemId);
  managersByItemId.set(itemId, manager);
  return manager;
}

export function createDragDropLayerGroupManager(
  itemId: string
): DragDropLayerGroupManager {
  const open = signal(false);
  let prevAutoOpen = false;
  let dragged = false;
  const autoOpenCtx = signal<DragDropLayerGroupAutoOpenContext>({
    activeItemID: false,
    activeItemList: {},
    isActive: false,
    data: null,
  });

  const setOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    open.value = typeof value === "function" ? value(open.value) : value;
  };

  const toggleOpen = () => {
    setOpen(!open.value);
  };

  const setDragged = (value: boolean) => {
    dragged = value;
  };

  const getDragged = () => dragged;

  const syncAutoOpenContext = (ctx: DragDropLayerGroupAutoOpenContext) => {
    autoOpenCtx.value = ctx;
  };

  effect(() => {
    G[`${itemId}OpenToggle`] = (value: boolean) => {
      open.value = value;
    };
    return () => {
      G[`${itemId}OpenToggle`] = null;
    };
  });

  effect(() => {
    const { activeItemID, activeItemList, isActive } = autoOpenCtx.value;

    if (!prevAutoOpen) {
      if (activeItemID === itemId || activeItemList?.[itemId] || isActive) {
        open.value = true;
        prevAutoOpen = true;
      }
    } else {
      if (activeItemID !== itemId || activeItemList?.[itemId] || isActive) {
        prevAutoOpen = false;
      }
    }
  });

  return {
    open,
    setOpen,
    toggleOpen,
    setDragged,
    getDragged,
    syncAutoOpenContext,
  };
}
