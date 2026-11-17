import { useLayoutEffect, useRef } from "preact/hooks";

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ElementRef = { current: HTMLElement | null };

export interface ModalLayerOptions {
  /** False while the element isn't acting as a modal. Defaults to true. */
  enabled?: boolean;
  /** What gets focus on open; defaults to the container itself. */
  initialFocusRef?: ElementRef;
  /** What Escape does while this is the top layer. Without it, nothing. */
  onEscape?: () => void;
  /** Pull focus back in whenever it lands outside, not just on Tab. */
  containFocus?: boolean;
}

interface Layer {
  /** When it opened; layers stack in this order. */
  order: number;
  container: ElementRef;
  element: HTMLElement | null;
  initialFocus: ElementRef | undefined;
  /**
   * Where focus goes back to when this layer closes; null for the layer
   * under it.
   */
  previous: HTMLElement | null;
  onEscape: { current: (() => void) | undefined };
  containFocus: boolean;
}

/** Open modal layers, the one on top last. */
const layers: Layer[] = [];
let opened = 0;

const top = () => layers[layers.length - 1];
const containerOf = (layer: Layer) => layer.container.current ?? layer.element;

function focusLayer(layer: Layer): void {
  (layer.initialFocus?.current ?? containerOf(layer))?.focus({
    preventScroll: true,
  });
}

function focusEdge(container: HTMLElement, last: boolean): void {
  const focusables =
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  (focusables[last ? focusables.length - 1 : 0] ?? container).focus();
}

function handleLayerKeyDown(layer: Layer, event: KeyboardEvent): void {
  if (event.defaultPrevented) return;
  const current = top();
  const container = current && containerOf(current);
  if (!current || !container) return;
  if (event.key === "Tab") {
    if (container.contains(document.activeElement)) {
      trapTabKey(event, container);
    } else {
      // Focus is in a layer under the top one, or nowhere: Tab goes into the
      // top one.
      event.preventDefault();
      focusEdge(container, event.shiftKey);
    }
    return;
  }
  if (event.key !== "Escape" || current !== layer) return;
  const onEscape = layer.onEscape.current;
  if (!onEscape) return;
  event.preventDefault();
  // Handled here, so a document listener behind the layer (a panel that
  // also closes on Escape) doesn't act on the same key press.
  event.stopPropagation();
  onEscape();
}

/** Keys pressed while nothing has focus go to the top layer. */
function handleDocumentKeyDown(event: KeyboardEvent): void {
  if (event.target !== document.body) return;
  const current = top();
  if (current) handleLayerKeyDown(current, event);
}

function handleFocusIn(event: FocusEvent): void {
  const current = top();
  if (!current?.containFocus) return;
  if (!containerOf(current)?.contains(event.target as Node)) {
    focusLayer(current);
  }
}

/**
 * Makes an element behave as a modal layer: focus moves into it when it opens
 * and back to where it was when it closes, Tab stays inside, and Escape calls
 * `onEscape`. Layers stack: only the one opened last takes Tab and Escape, so
 * a dialog opened over a sheet (or a tour tip over either) is the one the
 * keyboard reaches.
 */
export function useModalLayer(
  containerRef: ElementRef,
  options: ModalLayerOptions = {}
): void {
  const { enabled = true, initialFocusRef, containFocus = false } = options;
  const onEscape = useRef(options.onEscape);
  onEscape.current = options.onEscape;
  // Numbered while rendering, not in the effect: a parent renders before its
  // children but runs its effects after theirs, so a sheet that opens with a
  // dialog already inside it must still end up under that dialog.
  const order = useRef(0);
  if (!enabled) order.current = 0;
  else if (!order.current) order.current = ++opened;

  useLayoutEffect(() => {
    if (!enabled) return;
    const layer: Layer = {
      order: order.current,
      container: containerRef,
      element: containerRef.current,
      initialFocus: initialFocusRef,
      previous:
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null,
      onEscape,
      containFocus,
    };
    if (layers.length === 0) {
      document.addEventListener("keydown", handleDocumentKeyDown);
      document.addEventListener("focusin", handleFocusIn);
    }
    const onKeyDown = (event: KeyboardEvent) =>
      handleLayerKeyDown(layer, event);
    layer.element?.addEventListener("keydown", onKeyDown);
    const above = layers.find((other) => other.order > layer.order);
    if (above) {
      // Opened together with a layer inside it, which has already taken
      // focus: take over where focus came from, and give that layer this
      // one to go back to.
      layer.previous = above.previous;
      above.previous = null;
      layers.splice(layers.indexOf(above), 0, layer);
    } else {
      layers.push(layer);
      focusLayer(layer);
    }

    return () => {
      layer.element?.removeEventListener("keydown", onKeyDown);
      const index = layers.indexOf(layer);
      if (index === -1) return;
      const wasTop = index === layers.length - 1;
      layers.splice(index, 1);
      if (layers.length === 0) {
        document.removeEventListener("keydown", handleDocumentKeyDown);
        document.removeEventListener("focusin", handleFocusIn);
      }
      if (!wasTop) {
        // A layer opened from this one is still open and would hand focus
        // back to something that's going away: send it where this one would.
        const closing = containerOf(layer);
        for (const above of layers.slice(index)) {
          const from = above.previous;
          if (!from?.isConnected || closing?.contains(from)) {
            above.previous = layer.previous;
          }
        }
        return;
      }
      if (layer.previous?.isConnected) {
        layer.previous.focus({ preventScroll: true });
      } else {
        const below = top();
        if (below) focusLayer(below);
      }
    };
  }, [containerRef, initialFocusRef, enabled, containFocus]);
}

/**
 * Moves focus into the container on open and back on close.
 * @deprecated Use {@link useModalLayer}, which also handles Tab, Escape and
 * modals stacked over each other.
 */
export function useModalFocus(
  containerRef: ElementRef,
  initialFocusRef?: ElementRef,
  enabled = true,
  containFocus = false
): void {
  useModalLayer(containerRef, { initialFocusRef, enabled, containFocus });
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
