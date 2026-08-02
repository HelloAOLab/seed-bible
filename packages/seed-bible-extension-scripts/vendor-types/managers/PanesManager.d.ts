import { type ReadonlySignal, type Signal } from "@preact/signals";
import type { ComponentChild } from "preact";
/**
 * Placement mode for a pane. Chosen at creation time and immutable
 * thereafter — panes cannot switch placement after they're opened.
 */
export type PanePlacement = "fullscreen" | "side" | "floating";
/**
 * A pane title: either a plain string, or a render function (like `header`)
 * rendered as a component in the header so it can use hooks (i18n, signals).
 */
export type PaneTitle = string | (() => ComponentChild);
/**
 * Why a pane closed, passed to its `onClose` handler so consumers can react
 * differently to an explicit dismissal vs. the system taking the pane away:
 * - "user": the viewer clicked the pane header's close (X) button.
 * - "displaced": the pane was closed to make room for another pane opening (a
 *   fullscreen/mobile pane closes all others; a new side pane replaces the old).
 * - "programmatic": closed by an explicit `closePane`/`closeAll`/
 *   `closeFullscreenPanes` call (e.g. navigation revealing the reader).
 */
export type PaneCloseReason = "user" | "displaced" | "programmatic";
export interface Pane {
  /** Stable pane identifier. */
  id: string;
  /** Title shown in the pane's header. */
  title: PaneTitle;
  /** Custom component rendered in this pane. */
  component: () => ComponentChild;
  /**
   * Optional icon rendered before the title in the pane's header. Rendered as
   * a component so it can use hooks.
   */
  icon?: () => ComponentChild;
  /**
   * Optional custom header content rendered inside the pane's header, between
   * the title and the close button. Rendered as a component so it can use
   * hooks (i18n, signals). Omit for a plain title-and-close header.
   */
  header?: () => ComponentChild;
  /**
   * Optional callback invoked once when the pane closes, by any path: the
   * header's close (X) button, a programmatic `closePane`/`closeAll`/
   * `closeFullscreenPanes`, or displacement when another pane opens. Receives
   * why it closed (see `PaneCloseReason`) so a handler can distinguish an
   * explicit user dismissal from the system taking the pane away. Use it to
   * sync external state that mirrors the pane's open/closed status.
   */
  onClose?: (reason: PaneCloseReason) => void;
  /** Placement mode, fixed at creation time. */
  placement: PanePlacement;
  /** Pane X position for floating placement. */
  x: number;
  /** Pane Y position for floating placement. */
  y: number;
  /** Pane width (floating), or side-panel width (side placement). */
  width: number;
  /** Pane height (floating placement only). */
  height: number;
}
export interface PaneOpenOptions {
  /** Placement mode for the new pane. Immutable after creation. */
  placement: PanePlacement;
  /**
   * Title shown in the pane's header. Either a plain string, or a render
   * function (like `header`) rendered as a component so it can use hooks
   * (i18n, signals) — e.g. for a translated or reactive title.
   */
  title: PaneTitle;
  /** Custom component rendered in the pane. */
  component: () => ComponentChild;
  /**
   * Optional icon rendered before the title in the pane's header. Rendered as
   * a component so it can use hooks.
   */
  icon?: () => ComponentChild;
  /**
   * Optional custom header content rendered inside the pane's header, between
   * the title and the close button. Rendered as a component so it can use
   * hooks (i18n, signals). Omit for a plain title-and-close header.
   */
  header?: () => ComponentChild;
  /**
   * Optional callback invoked once when the pane closes, by any path: the
   * header's close (X) button, a programmatic `closePane`/`closeAll`/
   * `closeFullscreenPanes`, or displacement when another pane opens. Receives
   * why it closed (see `PaneCloseReason`) so a handler can distinguish an
   * explicit user dismissal from the system taking the pane away. Use it to
   * sync external state that mirrors the pane's open/closed status.
   */
  onClose?: (reason: PaneCloseReason) => void;
  /**
   * Optional stable pane identifier.
   * When provided, an existing pane with this ID is reused and updated with
   * the given title/component (placement is not changed). If no pane with
   * this ID exists, a new pane with this ID is created.
   */
  id?: string;
}
export interface PanesManager {
  /** All panes currently open. */
  panes: Signal<Pane[]>;
  /** Currently selected pane ID. */
  selectedPaneId: Signal<string | null>;
  /** Selects a pane by ID if it exists. */
  selectPane: (paneId: string) => void;
  /**
   * Opens a new pane, or updates an existing one when `options.id` matches an
   * open pane.
   *
   * Only one pane may fill the screen at a time: opening (or reusing) a
   * `"fullscreen"` pane — or opening any pane while on mobile, where every
   * pane is displayed fullscreen — closes all other panes first, leaving just
   * the new/reused pane. Only one `"side"` pane may be open at a time; opening
   * a new one closes the existing side pane first. `"floating"` panes
   * otherwise coexist, stacked by open/selection order.
   */
  openPane: (options: PaneOpenOptions) => Pane;
  /**
   * Closes a pane. Returns true when a pane was closed. `reason` is forwarded
   * to the pane's `onClose` handler and defaults to `"programmatic"`; the
   * header's close button passes `"user"`.
   */
  closePane: (paneId: string, reason?: PaneCloseReason) => boolean;
  /** Closes all panes. */
  closeAll: () => void;
  /**
   * Closes every pane currently filling the reader area — `"fullscreen"` panes
   * on desktop, and (since mobile displays every pane fullscreen) all panes on
   * mobile. Used to reveal the reader when the user navigates to a new
   * location. No-op when nothing is filling the screen.
   */
  closeFullscreenPanes: () => void;
  /** Sets the absolute position (CSS left/top) of a floating pane. */
  setPanePosition: (paneId: string, x: number, y: number) => void;
  /**
   * Resizes a pane by delta values. In side placement only width changes; in
   * floating placement both width and height change; fullscreen panes ignore
   * this call.
   */
  resizePane: (
    paneId: string,
    deltaWidth: number,
    deltaHeight: number,
    uiScale: number
  ) => void;
}
/**
 * Creates pane manager state and wiring.
 *
 * Panes are only ever used for custom, non-tab content (e.g. extension tool
 * panels, grid/map portals rendered via `PortalComponent`) — Bible reading
 * tabs live in `TabsLayoutManager` instead.
 */
export declare function createPanes(
  isMobile?: ReadonlySignal<boolean>
): PanesManager;
