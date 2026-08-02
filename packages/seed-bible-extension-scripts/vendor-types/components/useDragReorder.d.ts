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
export declare function useDragReorder(options: UseDragReorderOptions): {
  getRowClassName: (index: number) => string;
  getHandleProps: (index: number) => {
    onPointerDown: (event: PointerEvent) => void;
  };
};
export {};
