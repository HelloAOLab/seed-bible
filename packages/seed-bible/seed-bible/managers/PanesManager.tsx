import { signal, type ReadonlySignal, type Signal } from "@preact/signals";
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

function createPaneFactory() {
  let nextPaneId = 1;

  return (
    title: PaneTitle,
    component: () => ComponentChild,
    placement: PanePlacement,
    customId?: string,
    header?: () => ComponentChild,
    icon?: () => ComponentChild,
    onClose?: (reason: PaneCloseReason) => void
  ): Pane => {
    const paneId = nextPaneId;
    nextPaneId += 1;
    const offset = (paneId - 1) * 24;

    return {
      id: customId ?? `pane-${paneId}`,
      title,
      component,
      icon,
      header,
      onClose,
      placement,
      x: 48 + offset,
      y: 48 + offset,
      width: 480,
      height: 320,
    };
  };
}

/**
 * Creates pane manager state and wiring.
 *
 * Panes are only ever used for custom, non-tab content (e.g. extension tool
 * panels, grid/map portals rendered via `PortalComponent`) — Bible reading
 * tabs live in `TabsLayoutManager` instead.
 */
export function createPanes(isMobile?: ReadonlySignal<boolean>): PanesManager {
  const createPane = createPaneFactory();
  const panes = signal<Pane[]>([]);
  const selectedPaneId = signal<string | null>(null);

  const syncPaneState = (
    nextPanes: Pane[],
    nextSelectedPaneId?: string | null,
    closeReason: PaneCloseReason = "programmatic"
  ) => {
    const prevPanes = panes.value;
    panes.value = nextPanes;

    const desiredPaneId =
      nextSelectedPaneId !== undefined
        ? nextSelectedPaneId
        : selectedPaneId.value;
    if (desiredPaneId && nextPanes.some((pane) => pane.id === desiredPaneId)) {
      selectedPaneId.value = desiredPaneId;
    } else {
      selectedPaneId.value = nextPanes[nextPanes.length - 1]?.id ?? null;
    }

    // Notify any pane that just left the list — however it left: the header's
    // close (X) button, a programmatic closePane/closeAll/closeFullscreenPanes,
    // or displacement when another pane opens. This is the single place panes
    // are told they've closed, so an `onClose` handler runs exactly once per
    // removal no matter which path removed the pane, and receives why it closed
    // (`closeReason`). Fired after the signals are updated so the manager is
    // already consistent if a handler re-enters (e.g. calls closePane again — a
    // no-op, since the pane is already gone). Matched by id, so reusing a pane
    // id via openPane (an update, not a close) does not fire it.
    for (const prev of prevPanes) {
      if (!nextPanes.some((pane) => pane.id === prev.id)) {
        prev.onClose?.(closeReason);
      }
    }
  };

  const selectPane = (paneId: string) => {
    if (panes.value.some((pane) => pane.id === paneId)) {
      selectedPaneId.value = paneId;
    }
  };

  const openPane = (options: PaneOpenOptions): Pane => {
    // A pane fills the whole screen when it's fullscreen, or when we're on a
    // mobile viewport (where every pane is displayed fullscreen). Only one
    // such pane is allowed at a time, so opening one closes all others.
    const willFillScreen =
      options.placement === "fullscreen" || (isMobile?.value ?? false);

    if (options.id) {
      const existingPane =
        panes.peek().find((pane) => pane.id === options.id) ?? null;
      if (existingPane) {
        const updatedPane: Pane = {
          ...existingPane,
          title: options.title,
          component: options.component,
          icon: options.icon,
          header: options.header,
          onClose: options.onClose,
        };
        syncPaneState(
          willFillScreen
            ? [updatedPane]
            : panes
                .peek()
                .map((pane) =>
                  pane.id === updatedPane.id ? updatedPane : pane
                ),
          updatedPane.id,
          "displaced"
        );
        return updatedPane;
      }
    }

    // A fullscreen/mobile pane closes every other pane; a side pane replaces
    // only the existing side pane (at most one may be open at a time).
    const basePanes = willFillScreen
      ? []
      : options.placement === "side"
        ? panes.value.filter((pane) => pane.placement !== "side")
        : panes.value;

    const nextPane = createPane(
      options.title,
      options.component,
      options.placement,
      options.id,
      options.header,
      options.icon,
      options.onClose
    );
    syncPaneState([...basePanes, nextPane], nextPane.id, "displaced");
    return nextPane;
  };

  const closePane = (
    paneId: string,
    reason: PaneCloseReason = "programmatic"
  ) => {
    if (!panes.value.some((pane) => pane.id === paneId)) {
      return false;
    }

    syncPaneState(
      panes.value.filter((pane) => pane.id !== paneId),
      undefined,
      reason
    );
    return true;
  };

  /**
   * Sets the absolute position of a floating pane (in the pane's own CSS
   * coordinate space, i.e. the `left`/`top` values). The caller is
   * responsible for keeping the pane on-screen — the drag handler in
   * PaneLayout clamps against the pane's actual rendered geometry so the
   * result is correct even with the UI `zoom` and the shell's positioned
   * ancestor in play.
   */
  const setPanePosition = (paneId: string, x: number, y: number) => {
    panes.value = panes.value.map((pane) => {
      if (pane.id !== paneId || pane.placement !== "floating") {
        return pane;
      }

      return {
        ...pane,
        x: Math.max(0, x),
        y: Math.max(0, y),
      };
    });
  };

  const resizePane = (
    paneId: string,
    deltaWidth: number,
    deltaHeight: number,
    uiScale: number
  ) => {
    panes.value = panes.value.map((pane) => {
      if (pane.id !== paneId) {
        return pane;
      }

      if (pane.placement === "fullscreen") {
        return pane;
      }

      if (pane.placement === "side") {
        return {
          ...pane,
          width: Math.max(320 * uiScale, pane.width + deltaWidth),
        };
      }

      return {
        ...pane,
        width: Math.max(280 * uiScale, pane.width + deltaWidth),
        height: Math.max(180 * uiScale, pane.height + deltaHeight),
      };
    });
  };

  const closeAll = () => {
    syncPaneState([]);
  };

  const closeFullscreenPanes = () => {
    // On mobile every pane is displayed fullscreen (see effectivePanes /
    // openPane's willFillScreen), so treat them all as fullscreen there; on
    // desktop only real fullscreen panes fill the reader.
    const remaining =
      (isMobile?.value ?? false)
        ? []
        : panes.value.filter((pane) => pane.placement !== "fullscreen");
    if (remaining.length === panes.value.length) {
      return;
    }
    syncPaneState(remaining);
  };

  return {
    panes,
    selectedPaneId,
    selectPane,
    openPane,
    closePane,
    setPanePosition,
    resizePane,
    closeAll,
    closeFullscreenPanes,
  };
}
