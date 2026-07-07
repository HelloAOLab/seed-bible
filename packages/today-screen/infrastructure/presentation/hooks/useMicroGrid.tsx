import type { MutableRef } from "preact/hooks";

import { useLayoutEffect } from "preact/hooks";

const GAP = 8;
const CELL_SIZE = 8;
// One cell plus one gap — the stride between consecutive track starts.
const CELL_STRIDE = CELL_SIZE + GAP; // 16

/**
 * Turns a dense micro-grid container into a Bento/Masonry layout.
 *
 * Measures every direct child and snaps it to the number of 8px column/row
 * tracks it occupies, letting `grid-auto-flow: dense` pack them with no gaps.
 * Re-measures on:
 *   - child resize (e.g. a card gaining the `.expanded` class),
 *   - container resize (viewport / sidebar width changes),
 *   - children being added or removed (via the `dependency` argument).
 *
 * @param containerRef Ref to the `.filtered-reading-container` element.
 * @param dependency Value that changes when the rendered children change
 *   (e.g. the books array). Re-runs the setup so newly mounted cards — and the
 *   container itself, once it first appears — get observed.
 */
export const useMicroGrid = (
  containerRef: MutableRef<HTMLElement | null>,
  dependency?: unknown
) => {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const applySpan = (element: HTMLElement) => {
      const spanX = Math.ceil((element.offsetWidth + GAP) / CELL_STRIDE);
      const spanY = Math.ceil((element.offsetHeight + GAP) / CELL_STRIDE);

      const nextColumnEnd = `span ${spanX}`;
      const nextRowEnd = `span ${spanY}`;

      // Guard against redundant writes so the ResizeObserver settles instead of
      // bouncing between near-identical layouts.
      if (element.style.gridColumnEnd !== nextColumnEnd) {
        element.style.gridColumnEnd = nextColumnEnd;
      }
      if (element.style.gridRowEnd !== nextRowEnd) {
        element.style.gridRowEnd = nextRowEnd;
      }
    };

    const updateAllSpans = () => {
      for (const child of Array.from(container.children)) {
        applySpan(child as HTMLElement);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      updateAllSpans();
    });

    // Observe the container (its own width) and each card (its content size).
    resizeObserver.observe(container);
    for (const child of Array.from(container.children)) {
      resizeObserver.observe(child);
    }

    updateAllSpans();

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, dependency]);
};
