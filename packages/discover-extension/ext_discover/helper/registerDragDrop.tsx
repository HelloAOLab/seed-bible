import { DragDropWithGrouping } from "ext_discover.components.DragDropWithGrouping";

const G = globalThis as Record<string, any>;

export function registerDragDrop() {
  G.DragDrop = DragDropWithGrouping;
}
