import type { MutableRef } from "preact/hooks";
import { useEffect } from "preact/hooks";

/**
 * Marks which sides of a horizontally scrolling element have content hidden
 * past them, by toggling `data-fade-left` / `data-fade-right` on the element,
 * so CSS can fade only an edge that actually hides something. Re-checks on
 * scroll and whenever the element or its children change size.
 *
 * Attributes are set on the element directly rather than through state, so
 * scrolling doesn't re-render the component.
 *
 * @param ref Ref to the scrollable container.
 */
export const useScrollEdgeFade = (ref: MutableRef<HTMLElement | null>) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      // In right-to-left text `scrollLeft` starts at 0 at the right edge and
      // goes negative as the content scrolls towards the left.
      const rtl = getComputedStyle(el).direction === "rtl";
      const hiddenLeft = rtl ? maxScroll + el.scrollLeft : el.scrollLeft;
      const hiddenRight = rtl ? -el.scrollLeft : maxScroll - el.scrollLeft;
      // A pixel of slack absorbs sub-pixel rounding at either end.
      el.toggleAttribute("data-fade-left", hiddenLeft > 1);
      el.toggleAttribute("data-fade-right", hiddenRight > 1);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(el);
      for (const child of Array.from(el.children)) {
        observer.observe(child);
      }
    }

    return () => {
      el.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [ref]);
};
