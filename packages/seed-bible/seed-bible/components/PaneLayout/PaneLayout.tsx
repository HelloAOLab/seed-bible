import "./PaneLayout.css";
import { PaneHeader } from "../PaneHeader/PaneHeader";
import type { Pane } from "../../managers/PanesManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { UI_SIZE_SCALE_MAP } from "../../managers/SettingsManager";
import { useEffect, useRef } from "preact/hooks";

interface DragState {
  mode: "move" | "resize";
  paneId: string;
  startX: number;
  startY: number;
  placement: Pane["placement"];
  /**
   * Geometry captured at drag start, used to clamp a floating pane within the
   * viewport against its *actual* rendered box. This keeps the math correct
   * regardless of the UI `zoom` or the shell's positioned ancestor:
   * - grabOffset: pointer position relative to the pane's top-left (px)
   * - paneWidthPx/paneHeightPx: rendered footprint in real viewport px
   * - originX/originY, scaleX/scaleY: the linear map from the pane's CSS
   *   coordinate (left/top) to real viewport px, sampled from the element.
   */
  grabOffsetX?: number;
  grabOffsetY?: number;
  paneWidthPx?: number;
  paneHeightPx?: number;
  originX?: number;
  originY?: number;
  scaleX?: number;
  scaleY?: number;
}

function usePaneDrag(state: SeedBibleState) {
  const dragStateRef = useRef<DragState | null>(null);
  const paneElementMapRef = useRef(new Map<string, HTMLElement>());
  const { panes: panesManager, app } = state;

  const getUiScale = () =>
    UI_SIZE_SCALE_MAP[state.settings.settings.value.uiSize];

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const deltaX =
        dragState.placement === "side"
          ? dragState.startX - event.clientX
          : event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      if (dragState.mode === "move") {
        const grabOffsetX = dragState.grabOffsetX ?? 0;
        const grabOffsetY = dragState.grabOffsetY ?? 0;
        const paneWidthPx = dragState.paneWidthPx ?? 0;
        const paneHeightPx = dragState.paneHeightPx ?? 0;
        const scaleX = dragState.scaleX || 1;
        const scaleY = dragState.scaleY || 1;
        const originX = dragState.originX ?? 0;
        const originY = dragState.originY ?? 0;

        const maxLeft = Math.max(0, window.innerWidth - paneWidthPx);
        const maxTop = Math.max(0, window.innerHeight - paneHeightPx);
        const viewportLeft = Math.min(
          Math.max(0, event.clientX - grabOffsetX),
          maxLeft
        );
        const viewportTop = Math.min(
          Math.max(0, event.clientY - grabOffsetY),
          maxTop
        );

        panesManager.setPanePosition(
          dragState.paneId,
          (viewportLeft - originX) / scaleX,
          (viewportTop - originY) / scaleY
        );
      } else {
        panesManager.resizePane(dragState.paneId, deltaX, deltaY, getUiScale());
      }

      dragStateRef.current = {
        ...dragState,
        startX: event.clientX,
        startY: event.clientY,
      };
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [panesManager]);

  const startMove = (pane: Pane, event: PointerEvent) => {
    if (pane.placement !== "floating") {
      return;
    }
    event.stopPropagation();
    app.selectPane(pane.id);

    const element = paneElementMapRef.current.get(pane.id);
    const rect = element?.getBoundingClientRect();
    const scaleX = rect && pane.width ? rect.width / pane.width : 1;
    const scaleY = rect && pane.height ? rect.height / pane.height : 1;

    dragStateRef.current = {
      mode: "move",
      paneId: pane.id,
      placement: pane.placement,
      startX: event.clientX,
      startY: event.clientY,
      grabOffsetX: rect ? event.clientX - rect.left : 0,
      grabOffsetY: rect ? event.clientY - rect.top : 0,
      paneWidthPx: rect?.width ?? pane.width,
      paneHeightPx: rect?.height ?? pane.height,
      scaleX,
      scaleY,
      originX: rect ? rect.left - pane.x * scaleX : 0,
      originY: rect ? rect.top - pane.y * scaleY : 0,
    };
  };

  const startResize = (pane: Pane, event: PointerEvent) => {
    event.stopPropagation();
    event.preventDefault();
    app.selectPane(pane.id);
    dragStateRef.current = {
      mode: "resize",
      paneId: pane.id,
      placement: pane.placement,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const registerPaneElement = (paneId: string, element: HTMLElement | null) => {
    if (element) {
      paneElementMapRef.current.set(paneId, element);
    } else {
      paneElementMapRef.current.delete(paneId);
    }
  };

  return { startMove, startResize, registerPaneElement };
}

interface PaneLayoutProps {
  state: SeedBibleState;
}

/**
 * Renders floating panes as overlays on top of the tabs layout. Fullscreen
 * panes render inside the content row via `FullscreenPane`, and side panes via
 * `SidePane` — both as normal flex children that fit the reader area instead of
 * covering the whole viewport, so the desktop sidebar stays visible.
 */
export function PaneLayout(props: PaneLayoutProps) {
  const { state } = props;
  const { app, panes: panesManager } = state;
  const overlayPanes = app.effectivePanes.value.filter(
    (pane) => pane.placement === "floating"
  );
  const selectedPaneId = panesManager.selectedPaneId.value;
  const { startMove, startResize, registerPaneElement } = usePaneDrag(state);

  return (
    <>
      {overlayPanes.map((pane, index) => (
        <div
          key={pane.id}
          className={`sb-pane-shell sb-pane-shell-detached${
            pane.id === selectedPaneId ? " sb-pane-shell-active" : ""
          }`}
          data-placement={pane.placement}
          style={{
            left: `${pane.x}px`,
            top: `${pane.y}px`,
            width: `${pane.width}px`,
            height: `${pane.height}px`,
            zIndex:
              pane.id === selectedPaneId
                ? 70 + overlayPanes.length
                : 50 + index,
          }}
          ref={(element: HTMLElement | null) =>
            registerPaneElement(pane.id, element)
          }
          onPointerDown={() => app.selectPane(pane.id)}
        >
          <PaneHeader
            title={pane.title}
            header={pane.header}
            onClose={() => panesManager.closePane(pane.id)}
            onPointerDown={(event: PointerEvent) => startMove(pane, event)}
          />
          <div className="sb-pane-detached-body">
            <div className="sb-pane-component">
              <pane.component />
            </div>
            <div
              className="sb-pane-detached-resize-handle"
              onPointerDown={(event: PointerEvent) => startResize(pane, event)}
            ></div>
          </div>
        </div>
      ))}
    </>
  );
}

interface FullscreenPaneProps {
  state: SeedBibleState;
  pane: Pane;
}

/**
 * Renders the single fullscreen pane (if any) inside the content row, so it
 * fills only the reader area rather than the whole app.
 *
 * On desktop this leaves the sidebar docked beside it, visible and
 * interactable. On mobile the sidebar is a hidden drawer, so the content row
 * spans the whole viewport and the pane fills the screen as before — with the
 * bottom toolbar still floating above it (see BibleReaderToolbar).
 *
 * Only one pane can fill the screen at a time — opening a fullscreen pane
 * closes every other pane (see PanesManager) — so there is never a side or
 * floating pane sitting alongside it.
 */
export function FullscreenPane(props: FullscreenPaneProps) {
  const { state, pane } = props;
  const { app, panes: panesManager } = state;

  return (
    <div
      className="sb-pane-shell sb-pane-shell-detached"
      data-placement="fullscreen"
      style={{
        position: "absolute",
        top: "0px",
        left: "0px",
        right: "0px",
        bottom: "0px",
        zIndex: 100,
      }}
      onPointerDown={() => app.selectPane(pane.id)}
    >
      <PaneHeader
        title={pane.title}
        header={pane.header}
        onClose={() => panesManager.closePane(pane.id)}
      />
      <div className="sb-pane-detached-body">
        <div className="sb-pane-component">
          <pane.component />
        </div>
      </div>
    </div>
  );
}

interface SidePaneProps {
  state: SeedBibleState;
  pane: Pane;
}

/**
 * Renders the single side pane (if any) as a normal flex child in the
 * content row (see app/main.tsx), so it pushes the tabs layout instead of
 * overlaying it.
 */
export function SidePane(props: SidePaneProps) {
  const { state, pane } = props;
  const { app, panes: panesManager } = state;
  const { startResize, registerPaneElement } = usePaneDrag(state);

  return (
    <div
      className="sb-pane-side-shell"
      data-placement="side"
      style={{ width: `${pane.width}px` }}
      ref={(element: HTMLElement | null) =>
        registerPaneElement(pane.id, element)
      }
      onPointerDown={() => app.selectPane(pane.id)}
    >
      <PaneHeader
        title={pane.title}
        header={pane.header}
        onClose={() => panesManager.closePane(pane.id)}
      />
      <div className="sb-pane-detached-body">
        <div className="sb-pane-component">
          <pane.component />
        </div>
      </div>
      {/* Invisible full-height grab strip along the pane's resize edge. It's a
          direct child of the shell (not the scrolling body) so it spans the
          whole side and isn't clipped. */}
      <div
        className="sb-pane-detached-resize-handle-side"
        onPointerDown={(event: PointerEvent) => startResize(pane, event)}
      ></div>
    </div>
  );
}
