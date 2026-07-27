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

        const { contentWidth, outerWidth, gap } = getMasonryMetrics(container);
        if (outerWidth <= 0) return;

        const contentWidthPx = `${contentWidth}px`;
        for (const item of items) {
          if (item.style.width !== contentWidthPx) {
            item.style.width = contentWidthPx;
          }
        }

        const columnCount = Math.max(
          1,
          Math.floor((container.clientWidth + gap) / (outerWidth + gap))
        );
        const heights = items.map((item) => item.offsetHeight);
        const signature = `${container.clientWidth}|${columnCount}|${heights.join(",")}`;

        if (signature === lastLayoutSignature) return;
        lastLayoutSignature = signature;

        const columnHeights = new Array<number>(columnCount).fill(0);

        if (container.style.position !== "relative") {
          container.style.position = "relative";
        }

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
          const leftPx = `${x}px`;
          const topPx = `${y}px`;

          if (item.style.position !== "absolute") {
            item.style.position = "absolute";
          }
          if (item.style.left !== leftPx) {
            item.style.left = leftPx;
          }
          if (item.style.top !== topPx) {
            item.style.top = topPx;
          }
          columnHeights[column] = y + height + gap;
        }

        const tallest = Math.max(...columnHeights);
        const heightPx = `${Math.max(0, tallest - gap)}px`;
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
  }, [containerRef, enabled]);
};
