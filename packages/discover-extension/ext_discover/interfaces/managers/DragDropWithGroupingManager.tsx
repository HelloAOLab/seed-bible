import type { ReadonlySignal, Signal } from "@preact/signals";
import type { DragOverSet } from "ext_discover.models.playlistList";

export interface DragDropDragContext {
  transformedHistory: any[];
  list: any[];
}

export interface DragDropEndContext extends DragDropDragContext {
  setList: (value: any[] | ((prev: any[]) => any[])) => void;
}

export interface DragDropWithGroupingManager {
  opendedList: Signal<string | false>;
  dragOverSet: ReadonlySignal<DragOverSet>;
  draggedItemID: ReadonlySignal<string | null>;
  draggedParent: ReadonlySignal<string | null>;
  setOpenedList: (
    value: string | false | ((prev: string | false) => string | false)
  ) => void;
  setDragoverSet: (newState: DragOverSet) => void;
  handleDragStart: (
    index: number,
    pId: string | undefined,
    ctx: DragDropDragContext
  ) => void;
  handleDragOver: (
    index: number,
    pseudoIndex: number | null,
    pseudoID: string | null | undefined,
    event: any,
    ctx: DragDropDragContext
  ) => void;
  handleDragEnd: (ctx: DragDropEndContext) => void;
  autoPlayToggle: (
    index: number,
    pId: string,
    id: string,
    setList: (updater: (prev: any[]) => any[]) => void
  ) => void;
  toggleIsQuoteText: (
    id: string,
    pId: string | undefined,
    setList: (updater: (prev: any[]) => any[]) => void
  ) => void;
}
