import { useEffect, useRef, useState, useCallback } from "preact/hooks";

interface DragState {
  pointerId: number;
  fromIndex: number;
  rowHeight: number;
  lastClientY: number;
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
      const deltaY = event.clientY - drag.lastClientY;
      const offset = Math.round(deltaY / drag.rowHeight);
      if (offset === 0) {
        return;
      }
      const target = Math.max(
        0,
        Math.min(drag.fromIndex + offset, itemCountRef.current - 1)
      );
      if (target === drag.fromIndex) {
        return;
      }
      onReorder(drag.fromIndex, target);
      dragStateRef.current = {
        ...drag,
        fromIndex: target,
        lastClientY: event.clientY,
      };
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
    const rowHeight = row?.offsetHeight;
    if (!rowHeight) {
      return;
    }
    dragStateRef.current = {
      pointerId: event.pointerId,
      fromIndex: index,
      rowHeight,
      lastClientY: event.clientY,
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
