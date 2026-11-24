import type { Ref } from "preact";
import { useCallback, useRef } from "preact/hooks";

/**
 * A ref callback that never changes, for handing a component's own element to
 * a caller's ref (`inputRef` and the like). Passing the caller's ref straight
 * through goes wrong when it's an inline callback: it's a new function every
 * render, and Preact detaches and reattaches a ref that changes, so the
 * callback would be handed the element again on every re-render. `onElement`
 * is for the component's own use of the element, and is read once.
 */
export function useForwardedRef<T>(
  ref: Ref<T> | undefined,
  onElement?: (element: T | null) => void
): (element: T | null) => void {
  const latestRef = useRef(ref);
  latestRef.current = ref;
  const own = useRef(onElement);
  return useCallback((element: T | null) => {
    own.current?.(element);
    const current = latestRef.current;
    if (typeof current === "function") {
      current(element);
    } else if (current) {
      current.current = element;
    }
  }, []);
}
