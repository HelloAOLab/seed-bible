import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

/**
 * Sensor set shared by every drag-to-reorder list in the app. A small
 * pointer-move threshold keeps a plain tap on the handle from misfiring as a
 * drag; the keyboard sensor gives arrow-key reordering once the handle
 * (a real `<button>`) has focus, since dnd-kit's `attributes` already wires
 * the needed `tabIndex`/keydown handling onto it via `SortableRow`.
 */
export function useListReorderSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
}
