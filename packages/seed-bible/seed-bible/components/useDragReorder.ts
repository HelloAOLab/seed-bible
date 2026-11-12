import { useEffect, useRef, useState, useCallback } from "preact/hooks";

interface DragState {
  pointerId: number;
  /** Where the dragged row started, and where it is now. */
  startIndex: number;
  index: number;
  /** From one row's top to the next one's: a row's height and the gap. */
  rowPitch: number;
  startClientY: number;
}

interface UseDragReorderOptions {
  itemCount: number;
  onReorder: (from: number, to: number) => void;
}

/**
 * Pointer-events-based drag-to-reorder for a vertical list of rows, shared by
 * the playlist editor's Items list and the playback Queue list. Follows the
 * same window-listener pattern as `PaneLayout.tsx`'s `usePaneDrag`: drag state
 * lives in a ref (not state) so the move handler never closes over stale
 * data, and `pointermove`/`pointerup`/`pointercancel` are registered on
 * `window` once rather than on the dragged element, since the pointer can
 * move outside the row's bounds mid-drag.
 *
 * Reordering is applied live as the pointer crosses a row boundary (not just
 * once on drop), reusing the caller's `onReorder` as the "move one slot and
 * settle" primitive — this avoids a second, parallel bookkeeping layer just
 * to preview the drag before it's committed.
 */
export function useDragReorder(options: UseDragReorderOptions) {
  const { onReorder } = options;
  const dragStateRef = useRef<DragState | null>(null);
  const itemCountRef = useRef(options.itemCount);
  itemCountRef.current = options.itemCount;
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      // Measured from where the drag began, so the row stays under the
      // pointer: each move shifts the row a whole row, which counting from
      // the last move's pointer would add on top of the pointer's own way.
      const offset = Math.round(
        (event.clientY - drag.startClientY) / drag.rowPitch
      );
      const target = Math.max(
        0,
        Math.min(drag.startIndex + offset, itemCountRef.current - 1)
      );
      if (target === drag.index) {
        return;
      }
      onReorder(drag.index, target);
      dragStateRef.current = { ...drag, index: target };
      setDraggingIndex(target);
    };

    const endDrag = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      dragStateRef.current = null;
      setDraggingIndex(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [onReorder]);

  const startDrag = useCallback((index: number, event: PointerEvent) => {
    event.stopPropagation();
    const row = (event.currentTarget as HTMLElement | null)?.closest("li");
    if (!row) {
      return;
    }
    // The distance to a neighbouring row, which counts the gap between rows;
    // the row's own height where there's no neighbour (or no layout) to
    // measure.
    const neighbour = row.nextElementSibling ?? row.previousElementSibling;
    const measured = neighbour
      ? Math.abs(
          neighbour.getBoundingClientRect().top -
            row.getBoundingClientRect().top
        )
      : 0;
    const rowPitch = measured || row.offsetHeight;
    if (!rowPitch) {
      return;
    }
    dragStateRef.current = {
      pointerId: event.pointerId,
      startIndex: index,
      index,
      rowPitch,
      startClientY: event.clientY,
    };
    setDraggingIndex(index);
  }, []);

  const getRowClassName = (index: number): string =>
    draggingIndex === index ? " sb-discover-item--dragging" : "";

  const getHandleProps = (index: number) => ({
    onPointerDown: (event: PointerEvent) => startDrag(index, event),
  });

  return { getRowClassName, getHandleProps };
}
