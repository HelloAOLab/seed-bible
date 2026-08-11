/**
 * Keyboard navigation helpers for selectors, menus, and grids.
 *
 * Buttons activate on Enter/Space natively; these helpers only handle the
 * focus-movement keys (Arrow / Home / End). Callers wire one of them up to
 * the container's `onKeyDown` and the helper queries focusable items inside
 * that container by selector.
 */

const DEFAULT_ITEM_SELECTOR = [
  "button:not([disabled])",
  '[role="option"]:not([aria-disabled="true"])',
  '[role="menuitem"]:not([aria-disabled="true"])',
  '[role="menuitemradio"]:not([aria-disabled="true"])',
  '[role="menuitemcheckbox"]:not([aria-disabled="true"])',
  '[role="radio"]:not([aria-disabled="true"])',
  '[role="tab"]:not([aria-disabled="true"])',
  '[tabindex="0"]:not([aria-disabled="true"])',
  ".sb-context-menu-item:not([disabled])",
  ".sb-tool-context-menu-item:not([disabled])",
  ".sb-language-picker-item:not([disabled])",
].join(",");

export interface KeyNavOptions {
  /**
   * CSS selector identifying focusable items inside the container.
   * Defaults to enabled buttons, options, and menu items.
   */
  itemSelector?: string;
  /** Wrap from last to first (and vice versa). Defaults to true. */
  wrap?: boolean;
}

function getItems(container: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.offsetParent !== null
  );
}

type Orientation = "vertical" | "horizontal";

function handleLinearKeyNav(
  event: KeyboardEvent,
  container: HTMLElement | null,
  orientation: Orientation,
  options: KeyNavOptions
): boolean {
  if (!container) return false;
  const { wrap = true, itemSelector = DEFAULT_ITEM_SELECTOR } = options;
  const items = getItems(container, itemSelector);
  if (items.length === 0) return false;

  const active = document.activeElement as HTMLElement | null;
  const currentIndex = active ? items.indexOf(active) : -1;
  const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
  const prevKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";

  let nextIndex: number;
  if (event.key === nextKey) {
    nextIndex = currentIndex < 0 ? 0 : currentIndex + 1;
  } else if (event.key === prevKey) {
    nextIndex = currentIndex < 0 ? items.length - 1 : currentIndex - 1;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = items.length - 1;
  } else {
    return false;
  }

  if (nextIndex < 0) {
    if (!wrap) return false;
    nextIndex = items.length - 1;
  } else if (nextIndex >= items.length) {
    if (!wrap) return false;
    nextIndex = 0;
  }
  if (nextIndex === currentIndex) return false;

  event.preventDefault();
  items[nextIndex]?.focus();
  return true;
}

/** Vertical list: ArrowUp/ArrowDown/Home/End. */
export function handleVerticalListKeyNav(
  event: KeyboardEvent,
  container: HTMLElement | null,
  options: KeyNavOptions = {}
): boolean {
  return handleLinearKeyNav(event, container, "vertical", options);
}

/** Horizontal list: ArrowLeft/ArrowRight/Home/End. */
export function handleHorizontalListKeyNav(
  event: KeyboardEvent,
  container: HTMLElement | null,
  options: KeyNavOptions = {}
): boolean {
  return handleLinearKeyNav(event, container, "horizontal", options);
}

const ARROW_DIRECTIONS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
} as const;

type Direction = (typeof ARROW_DIRECTIONS)[keyof typeof ARROW_DIRECTIONS];

/**
 * Two-dimensional grid: arrow keys move to the geometrically nearest item
 * in the requested direction (uses bounding-rect math so wrapped rows of
 * variable width still behave intuitively). Home/End jump to first/last.
 */
export function handleGridKeyNav(
  event: KeyboardEvent,
  container: HTMLElement | null,
  options: KeyNavOptions = {}
): boolean {
  if (!container) return false;
  const { itemSelector = DEFAULT_ITEM_SELECTOR } = options;
  const items = getItems(container, itemSelector);
  if (items.length === 0) return false;

  if (event.key === "Home") {
    event.preventDefault();
    items[0]?.focus();
    return true;
  }
  if (event.key === "End") {
    event.preventDefault();
    items[items.length - 1]?.focus();
    return true;
  }

  const direction =
    ARROW_DIRECTIONS[event.key as keyof typeof ARROW_DIRECTIONS];
  if (!direction) return false;

  const active = document.activeElement as HTMLElement | null;
  if (!active || !items.includes(active)) {
    event.preventDefault();
    items[0]?.focus();
    return true;
  }

  const next = findNearestInDirection(active, items, direction);
  if (!next) return false;

  event.preventDefault();
  next.focus();
  return true;
}

function findNearestInDirection(
  active: HTMLElement,
  items: HTMLElement[],
  direction: Direction
): HTMLElement | null {
  const currentRect = active.getBoundingClientRect();
  const cx = currentRect.left + currentRect.width / 2;
  const cy = currentRect.top + currentRect.height / 2;

  let best: { el: HTMLElement; score: number } | null = null;

  for (const el of items) {
    if (el === active) continue;
    const rect = el.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - cx;
    const dy = rect.top + rect.height / 2 - cy;

    let primary: number;
    let secondary: number;
    if (direction === "up") {
      if (dy >= -1) continue;
      primary = -dy;
      secondary = Math.abs(dx);
    } else if (direction === "down") {
      if (dy <= 1) continue;
      primary = dy;
      secondary = Math.abs(dx);
    } else if (direction === "left") {
      if (dx >= -1) continue;
      primary = -dx;
      secondary = Math.abs(dy);
    } else {
      if (dx <= 1) continue;
      primary = dx;
      secondary = Math.abs(dy);
    }

    const score = primary + secondary * 2;
    if (!best || score < best.score) {
      best = { el, score };
    }
  }

  return best?.el ?? null;
}

/**
 * Open-on-arrow handler for menu trigger buttons. Call from the trigger's
 * `onKeyDown` so ArrowDown/ArrowUp opens the menu and focuses the first or
 * last item. The container lookup runs after `open()` so the menu has
 * rendered.
 */
export function handleMenuTriggerKeyDown(
  event: KeyboardEvent,
  args: {
    isOpen: boolean;
    open: () => void;
    getMenuContainer: () => HTMLElement | null;
    itemSelector?: string;
  }
): boolean {
  const {
    isOpen,
    open,
    getMenuContainer,
    itemSelector = DEFAULT_ITEM_SELECTOR,
  } = args;

  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return false;
  event.preventDefault();
  if (!isOpen) open();

  // Wait for the menu to render before focusing its first/last item.
  requestAnimationFrame(() => {
    const container = getMenuContainer();
    if (!container) return;
    const items = getItems(container, itemSelector);
    if (items.length === 0) return;
    if (event.key === "ArrowDown") {
      items[0]?.focus();
    } else {
      items[items.length - 1]?.focus();
    }
  });
  return true;
}
