import type { MutableRef } from "preact/hooks";

const { useEffect } = os.appHooks;

/**
 * Lets a horizontally-overflowing element be scrolled with the vertical mouse
 * wheel. Attaches a non-passive `wheel` listener that translates `deltaY` into
 * horizontal scroll, but only while the element actually overflows its width.
 *
 * @param ref Ref to the scrollable container.
 */
export const useHorizontalScroll = (ref: MutableRef<HTMLElement | null>) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;

      const isScrollable = el.scrollWidth > el.clientWidth;
      if (isScrollable) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [ref]);
};

export type UseHorizontalScroll = typeof useHorizontalScroll;
