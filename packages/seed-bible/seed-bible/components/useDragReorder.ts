import { useEffect, useRef, useState, useCallback } from "preact/hooks";

interface DragState {
  pointerId: number;
  /** Where the row was when the drag began, and the pointer with it. */
  startIndex: number;
  startClientY: number;
  /** Where the row is now. */
  index: number;
  rowHeight: number;
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
 * to preview the drag before it's committed. The row's place is worked out
 * from how far the pointer is from where the drag began, so it stays under
 * the pointer however the moves arrive.
 *
 * The handle also moves its row with the arrow keys, one place at a time,
 * keeping the focus on it.
 */
export function useDragReorder(options: UseDragReorderOptions) {
  const { onReorder } = options;
  const dragStateRef = useRef<DragState | null>(null);
  const itemCountRef = useRef(options.itemCount);
  itemCountRef.current = options.itemCount;
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  // The handle to focus once a keyboard move has re-rendered the list: the
  // moved row is drawn by a different element at its new place.
  const pendingFocusRef = useRef<{ list: Element; index: number } | null>(null);

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) {
      return;
    }
    pendingFocusRef.current = null;
    const handles =
      pending.list.querySelectorAll<HTMLElement>("[data-drag-handle]");
    handles[pending.index]?.focus();
  });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      const rows = Math.round(
        (event.clientY - drag.startClientY) / drag.rowHeight
      );
      const target = Math.max(
        0,
        Math.min(drag.startIndex + rows, itemCountRef.current - 1)
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
    const rowHeight = row?.offsetHeight;
    if (!rowHeight) {
      return;
    }
    dragStateRef.current = {
      pointerId: event.pointerId,
      startIndex: index,
      startClientY: event.clientY,
      index,
      rowHeight,
    };
    setDraggingIndex(index);
  }, []);

  const moveByKey = (index: number, event: KeyboardEvent) => {
    const step =
      event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    const target = index + step;
    if (step === 0 || target < 0 || target >= itemCountRef.current) {
      return;
    }
    event.preventDefault();
    const list = (event.currentTarget as HTMLElement | null)?.closest("ul, ol");
    if (list) {
      pendingFocusRef.current = { list, index: target };
    }
    onReorder(index, target);
  };

  const getRowClassName = (index: number): string =>
    draggingIndex === index ? " sb-discover-item--dragging" : "";

  const getHandleProps = (index: number) => ({
    "data-drag-handle": "",
    "aria-keyshortcuts": "ArrowUp ArrowDown",
    onPointerDown: (event: PointerEvent) => startDrag(index, event),
    onKeyDown: (event: KeyboardEvent) => moveByKey(index, event),
  });

  return { getRowClassName, getHandleProps };
}
