import type { MutableRef } from "preact/hooks";
import { useLayoutEffect } from "preact/hooks";

export const clearItemStyles = (item: HTMLElement) => {
  item.style.position = "";
  item.style.left = "";
  item.style.top = "";
  item.style.width = "";
};

export const clearContainerStyles = (container: HTMLElement) => {
  container.style.height = "";
};

export const getGap = (container: HTMLElement) => {
  const styles = getComputedStyle(container);
  const scaleFactor =
    parseFloat(styles.getPropertyValue("--scale-factor")) || 1;
  return 12 * scaleFactor;
};

export const computeColumnCount = (
  containerWidth: number,
  columnWidth: number,
  gap: number
): number => {
  if (columnWidth <= 0) return 1;
  return Math.max(1, Math.floor((containerWidth + gap) / (columnWidth + gap)));
};

export interface MasonryPosition {
  left: number;
  top: number;
  width: number;
}

/**
 * Round-robin column assignment: item i → column (i % columnCount).
 * Preserves left-to-right reading order across the top of each column.
 */
export const computeMasonryPositions = (
  heights: readonly number[],
  columnWidth: number,
  gap: number,
  columnCount: number
): { positions: MasonryPosition[]; containerHeight: number } => {
  const safeColumnCount = Math.max(1, columnCount);
  const columnHeights = new Array<number>(safeColumnCount).fill(0);
  const positions = heights.map((height, index) => {
    const column = index % safeColumnCount;
    const left = column * (columnWidth + gap);
    const top = columnHeights[column]!;
    columnHeights[column] = top + height + gap;
    return { left, top, width: columnWidth };
  });
  const tallest = columnHeights.length > 0 ? Math.max(...columnHeights) : 0;
  return {
    positions,
    containerHeight: Math.max(0, tallest - gap),
  };
};

/**
 * Column masonry (waterfall): books keep left-to-right order by going into
 * column `index % columnCount`, then stack in that column. Book width stays
 * natural (CSS max-content) so padding matches the original flex layout.
 */
export const useMasonryLayout = (
  containerRef: MutableRef<HTMLDivElement | null>,
  enabled: boolean
) => {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!enabled) {
      clearContainerStyles(container);
      for (const child of Array.from(container.children)) {
        clearItemStyles(child as HTMLElement);
      }
      return;
    }

    let frameId = 0;
    let isLayingOut = false;
    let lastLayoutSignature = "";

    const observeChildren = (observer: ResizeObserver, parent: HTMLElement) => {
      for (const child of Array.from(parent.children)) {
        observer.observe(child);
      }
    };

    const layout = () => {
      if (isLayingOut) return;
      isLayingOut = true;

      try {
        const items = Array.from(container.children) as HTMLElement[];
        if (items.length === 0) {
          lastLayoutSignature = "";
          clearContainerStyles(container);
          return;
        }

        const gap = getGap(container);

        // Drop inline width so CSS `width: max-content` measures the true
        // natural book size (chapter grid + padding + border + header).
        for (const item of items) {
          item.style.width = "";
        }

        const columnWidth = Math.max(
          ...items.map((item) => item.offsetWidth),
          0
        );
        if (columnWidth <= 0) return;

        const columnCount = computeColumnCount(
          container.clientWidth,
          columnWidth,
          gap
        );
        const heights = items.map((item) => item.offsetHeight);
        const signature = `${container.clientWidth}|${columnCount}|${columnWidth}|${heights.join(",")}`;

        if (signature === lastLayoutSignature) {
          const widthPx = `${columnWidth}px`;
          for (const item of items) {
            if (item.style.width !== widthPx) item.style.width = widthPx;
          }
          return;
        }
        lastLayoutSignature = signature;

        const { positions, containerHeight } = computeMasonryPositions(
          heights,
          columnWidth,
          gap,
          columnCount
        );

        const widthPx = `${columnWidth}px`;
        items.forEach((item, index) => {
          const position = positions[index];
          if (!position) return;
          const leftPx = `${position.left}px`;
          const topPx = `${position.top}px`;

          if (item.style.position !== "absolute") {
            item.style.position = "absolute";
          }
          if (item.style.left !== leftPx) item.style.left = leftPx;
          if (item.style.top !== topPx) item.style.top = topPx;
          if (item.style.width !== widthPx) item.style.width = widthPx;
        });

        const heightPx = `${containerHeight}px`;
        if (container.style.height !== heightPx) {
          container.style.height = heightPx;
        }
      } finally {
        isLayingOut = false;
      }
    };

    if (typeof ResizeObserver === "undefined") {
      layout();
      return () => {
        cancelAnimationFrame(frameId);
        lastLayoutSignature = "";
        clearContainerStyles(container);
        for (const child of Array.from(container.children)) {
          clearItemStyles(child as HTMLElement);
        }
      };
    }

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(runLayout);
    });

    const mutationObserver = new MutationObserver(() => {
      lastLayoutSignature = "";
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(runLayout);
    });

    const runLayout = () => {
      observer.disconnect();
      mutationObserver.disconnect();
      layout();
      observer.observe(container);
      observeChildren(observer, container);
      mutationObserver.observe(container, { childList: true });
    };

    runLayout();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      mutationObserver.disconnect();
      lastLayoutSignature = "";
      clearContainerStyles(container);
      for (const child of Array.from(container.children)) {
        clearItemStyles(child as HTMLElement);
      }
    };
  }, [containerRef]);
};
