import { useLayoutEffect } from "preact/hooks";

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalFocus(
  containerRef: { current: HTMLElement | null },
  initialFocusRef?: { current: HTMLElement | null },
  enabled = true,
  containFocus = false
): void {
  useLayoutEffect(() => {
    if (!enabled) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    (initialFocusRef?.current ?? containerRef.current)?.focus({
      preventScroll: true,
    });
    const keepFocusInside = (event: FocusEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        (initialFocusRef?.current ?? containerRef.current)?.focus({
          preventScroll: true,
        });
      }
    };
    if (containFocus) document.addEventListener("focusin", keepFocusInside);
    return () => {
      if (containFocus) {
        document.removeEventListener("focusin", keepFocusInside);
      }
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [containerRef, initialFocusRef, enabled, containFocus]);
}

export function trapTabKey(event: KeyboardEvent, container: HTMLElement): void {
  if (event.key !== "Tab") return;
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
