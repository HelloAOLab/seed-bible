import type { MutableRef } from "preact/hooks";
import { useLayoutEffect } from "preact/hooks";

const clearItemStyles = (item: HTMLElement) => {
  item.style.position = "";
  item.style.left = "";
  item.style.top = "";
  item.style.width = "";
};

const clearContainerStyles = (container: HTMLElement) => {
  container.style.height = "";
  container.style.position = "";
};

const getMasonryMetrics = (container: HTMLElement) => {
  const styles = getComputedStyle(container);
  const scaleFactor =
    parseFloat(styles.getPropertyValue("--scale-factor")) || 1;
  const gap = 12 * scaleFactor;
  const chapterWidth =
    parseFloat(styles.getPropertyValue("--chapter-width")) || scaleFactor * 32;
  const chapterGap =
    parseFloat(styles.getPropertyValue("--chapter-gap")) || scaleFactor * 3;
  const maxColumns =
    parseInt(styles.getPropertyValue("--book-max-columns"), 10) || 5;
  const padding = 16 * scaleFactor;
  const border = 4 * scaleFactor;
  const gridWidth = maxColumns * chapterWidth + (maxColumns - 1) * chapterGap;
  const contentWidth = gridWidth;
  const outerWidth = contentWidth + padding + border;

  return { contentWidth, outerWidth, gap };
};

/**
 * Waterfall masonry: each item goes into the shortest column so shorter books
 * leave no rigid row gaps. DOM order stays Genesis → Exodus → Leviticus; only
 * visual positions change.
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

    const layout = () => {
      if (isLayingOut) return;
      isLayingOut = true;

      try {
        const items = Array.from(container.children) as HTMLElement[];
        if (items.length === 0) {
          clearContainerStyles(container);
          return;
        }

        for (const item of items) {
          clearItemStyles(item);
        }
        clearContainerStyles(container);

        const { contentWidth, outerWidth, gap } = getMasonryMetrics(container);
        if (outerWidth <= 0) return;

        for (const item of items) {
          item.style.width = `${contentWidth}px`;
        }

        const columnCount = Math.max(
          1,
          Math.floor((container.clientWidth + gap) / (outerWidth + gap))
        );
        const columnHeights = new Array<number>(columnCount).fill(0);

        container.style.position = "relative";

        for (const item of items) {
          const height = item.offsetHeight;
          let column = 0;
          for (let i = 1; i < columnCount; i++) {
            if (columnHeights[i]! < columnHeights[column]!) {
              column = i;
            }
          }

          const x = column * (outerWidth + gap);
          const y = columnHeights[column]!;
          item.style.position = "absolute";
          item.style.left = `${x}px`;
          item.style.top = `${y}px`;
          item.style.width = `${contentWidth}px`;
          columnHeights[column] = y + height + gap;
        }

        const tallest = Math.max(...columnHeights);
        container.style.height = `${Math.max(0, tallest - gap)}px`;
      } finally {
        isLayingOut = false;
      }
    };

    const scheduleLayout = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(layout);
    };

    layout();

    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelAnimationFrame(frameId);
        clearContainerStyles(container);
        for (const child of Array.from(container.children)) {
          clearItemStyles(child as HTMLElement);
        }
      };
    }

    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(container);
    for (const child of Array.from(container.children)) {
      observer.observe(child);
    }

    const mutationObserver = new MutationObserver(() => {
      for (const child of Array.from(container.children)) {
        observer.observe(child);
      }
      scheduleLayout();
    });
    mutationObserver.observe(container, { childList: true });

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      mutationObserver.disconnect();
      clearContainerStyles(container);
      for (const child of Array.from(container.children)) {
        clearItemStyles(child as HTMLElement);
      }
    };
  }, [containerRef, enabled]);
};
