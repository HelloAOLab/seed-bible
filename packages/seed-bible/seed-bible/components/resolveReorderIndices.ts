import type { DragEndEvent } from "@dnd-kit/core";

/**
 * Resolves a completed drag into a plain `{from, to}` index pair, or null
 * when nothing should change (dropped outside any row, or dropped back on
 * itself). `active.id`/`over.id` are the rows' stable per-item ids (see
 * `useStableListIds`), not their array indices, so `ids` — the same id list
 * passed to `SortableContext`, in current array order — is needed to
 * translate them back into positions.
 *
 * Takes only the two event fields it needs (not the full `DragEndEvent`) so
 * tests can construct a fake event as a plain `{ active: { id }, over: { id } }`
 * object without wiring up dnd-kit's sensors/collision machinery.
 */
export function resolveReorderIndices(
  event: Pick<DragEndEvent, "active" | "over">,
  ids: readonly (string | number)[]
): { from: number; to: number } | null {
  const { active, over } = event;
  if (!over || active.id === over.id) {
    return null;
  }
  const from = ids.indexOf(active.id);
  const to = ids.indexOf(over.id);
  if (from === -1 || to === -1) {
    return null;
  }
  return { from, to };
}
