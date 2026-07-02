import type { ReadonlySignal, Signal } from "@preact/signals";

export interface DragDropLayerGroupAutoOpenContext {
  activeItemID?: string | false;
  activeItemList?: Record<string, boolean>;
  isActive: boolean;
  data: any;
}

export interface DragDropLayerGroupManager {
  open: ReadonlySignal<boolean>;
  setOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  toggleOpen: () => void;
  setDragged: (value: boolean) => void;
  getDragged: () => boolean;
  syncAutoOpenContext: (ctx: DragDropLayerGroupAutoOpenContext) => void;
}
