import type { MutableRef } from "preact/hooks";
import { useCallback, useEffect, useRef } from "preact/hooks";

/** `"x"` toggles `data-fade-left`/`-right`; `"y"` toggles `data-fade-top`/`-bottom`. */
export type ScrollEdgeFadeAxis = "x" | "y";

/**
 * Marks which sides of a scrolling element have content hidden past them, by
 * toggling `data-fade-*` attributes on the element, so CSS can fade only an
 * edge that actually hides something. Re-checks on scroll, whenever the
 * element or its children change size, and when children are added or
 * removed.
 *
 * Attributes are set on the element directly rather than through state, so
 * scrolling doesn't re-render the component.
 *
 * @returns A function that stops watching the element.
 */
function attachScrollEdgeFade(
  el: HTMLElement,
  axis: ScrollEdgeFadeAxis
): () => void {
  const update = () => {
    // A pixel of slack absorbs sub-pixel rounding at either end.
    if (axis === "y") {
      const hiddenBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
      el.toggleAttribute("data-fade-top", el.scrollTop > 1);
      el.toggleAttribute("data-fade-bottom", hiddenBottom > 1);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    // In right-to-left text `scrollLeft` starts at 0 at the right edge and
    // goes negative as the content scrolls towards the left.
    const rtl = getComputedStyle(el).direction === "rtl";
    const hiddenLeft = rtl ? maxScroll + el.scrollLeft : el.scrollLeft;
    const hiddenRight = rtl ? -el.scrollLeft : maxScroll - el.scrollLeft;
    el.toggleAttribute("data-fade-left", hiddenLeft > 1);
    el.toggleAttribute("data-fade-right", hiddenRight > 1);
  };

  update();
  el.addEventListener("scroll", update, { passive: true });

  let resizeObserver: ResizeObserver | undefined;
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    for (const child of Array.from(el.children)) {
      resizeObserver.observe(child);
    }
  }

  // A child added or removed later (a new tab) changes how much there is to
  // scroll without resizing the element itself.
  let mutationObserver: MutationObserver | undefined;
  if (typeof MutationObserver !== "undefined") {
    mutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof Element) {
            resizeObserver?.observe(node);
          }
        }
      }
      update();
    });
    mutationObserver.observe(el, { childList: true });
  }

  return () => {
    el.removeEventListener("scroll", update);
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
  };
}

/**
 * Fades the edges of the scrolling element in `ref` (see
 * `attachScrollEdgeFade`). The element must stay the same for the
 * component's lifetime; use `useScrollEdgeFadeRef` when it can be swapped.
 *
 * @param ref Ref to the scrollable container.
 * @param axis Which direction the container scrolls in.
 */
export const useScrollEdgeFade = (
  ref: MutableRef<HTMLElement | null>,
  axis: ScrollEdgeFadeAxis = "x"
) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return attachScrollEdgeFade(el, axis);
  }, [ref, axis]);
};

/**
 * Callback-ref form of `useScrollEdgeFade`, for a component that renders
 * different scroll containers at different times (they're each watched while
 * mounted).
 *
 * @param axis Which direction the container scrolls in.
 */
export const useScrollEdgeFadeRef = (axis: ScrollEdgeFadeAxis) => {
  const detach = useRef<(() => void) | null>(null);
  useEffect(() => () => detach.current?.(), []);
  return useCallback(
    (el: HTMLElement | null) => {
      detach.current?.();
      detach.current = el ? attachScrollEdgeFade(el, axis) : null;
    },
    [axis]
  );
};
