import type { DragEndEvent } from "@dnd-kit/core";

/**
 * Resolves a completed drag into a plain `{from, to}` index pair, or null
 * when nothing should change (dropped outside any row, or dropped back on
 * itself). IDs passed to `useSortable`/`SortableContext` in this codebase ARE
 * the rows' array indices, so `active.id`/`over.id` don't need an
 * id-to-index lookup.
 *
 * Takes only the two fields it needs (not the full `DragEndEvent`) so tests
 * can construct a fake event as a plain `{ active: { id }, over: { id } }`
 * object without wiring up dnd-kit's sensors/collision machinery.
 */
export function resolveReorderIndices(
  event: Pick<DragEndEvent, "active" | "over">
): { from: number; to: number } | null {
  const { active, over } = event;
  if (!over || active.id === over.id) {
    return null;
  }
  const from = Number(active.id);
  const to = Number(over.id);
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return null;
  }
  return { from, to };
}
