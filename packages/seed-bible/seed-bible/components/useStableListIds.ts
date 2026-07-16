import { useRef } from "preact/hooks";

/**
 * Assigns each item in `items` a numeric id that follows it by object
 * identity across renders — including through a reorder, since splice moves
 * the reference rather than cloning it. Used as both the `key` and the
 * `useSortable`/`SortableContext` id for a draggable row.
 *
 * Keying/id-ing rows by array index instead would keep a fixed slot (and its
 * DOM node) bound to the same index across a reorder, since the ordered list
 * of indices never actually changes — only each slot's rendered content
 * would update. dnd-kit's drop animation relies on the dragged row's id
 * moving to its new position in that list, so with index-based ids it clears
 * the row's drag transform right back to its original slot instead of
 * animating it to its new one, while everything else jumps instantly.
 */
export function useStableListIds<T extends object>(
  items: readonly T[]
): number[] {
  const idsRef = useRef(new WeakMap<T, number>());
  const counterRef = useRef(0);
  return items.map((item) => {
    let id = idsRef.current.get(item);
    if (id === undefined) {
      id = counterRef.current++;
      idsRef.current.set(item, id);
    }
    return id;
  });
}
