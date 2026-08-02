/**
 * Keyboard navigation helpers for selectors, menus, and grids.
 *
 * Buttons activate on Enter/Space natively; these helpers only handle the
 * focus-movement keys (Arrow / Home / End). Callers wire one of them up to
 * the container's `onKeyDown` and the helper queries focusable items inside
 * that container by selector.
 */
export interface KeyNavOptions {
  /**
   * CSS selector identifying focusable items inside the container.
   * Defaults to enabled buttons, options, and menu items.
   */
  itemSelector?: string;
  /** Wrap from last to first (and vice versa). Defaults to true. */
  wrap?: boolean;
}
/** Vertical list: ArrowUp/ArrowDown/Home/End. */
export declare function handleVerticalListKeyNav(
  event: KeyboardEvent,
  container: HTMLElement | null,
  options?: KeyNavOptions
): boolean;
/** Horizontal list: ArrowLeft/ArrowRight/Home/End. */
export declare function handleHorizontalListKeyNav(
  event: KeyboardEvent,
  container: HTMLElement | null,
  options?: KeyNavOptions
): boolean;
/**
 * Two-dimensional grid: arrow keys move to the geometrically nearest item
 * in the requested direction (uses bounding-rect math so wrapped rows of
 * variable width still behave intuitively). Home/End jump to first/last.
 */
export declare function handleGridKeyNav(
  event: KeyboardEvent,
  container: HTMLElement | null,
  options?: KeyNavOptions
): boolean;
/**
 * Open-on-arrow handler for menu trigger buttons. Call from the trigger's
 * `onKeyDown` so ArrowDown/ArrowUp opens the menu and focuses the first or
 * last item. The container lookup runs after `open()` so the menu has
 * rendered.
 */
export declare function handleMenuTriggerKeyDown(
  event: KeyboardEvent,
  args: {
    isOpen: boolean;
    open: () => void;
    getMenuContainer: () => HTMLElement | null;
    itemSelector?: string;
  }
): boolean;
