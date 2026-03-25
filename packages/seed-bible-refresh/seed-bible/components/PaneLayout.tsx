import { BibleReader } from "seed-bible.components.BibleReader";
import { BelowReaderToolbar } from "seed-bible.components.BelowReaderToolbar";
import { CasualOSApp } from "seed-bible.components.CasualOSApp";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { TabsManager } from "seed-bible.managers.TabsManager";
import type { Pane, PanesManager } from "seed-bible.managers.PanesManager";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import {
  type ToolsManager,
  type BibleEmptyPaneTool,
} from "seed-bible.managers.BibleToolsManager";

const { useEffect, useRef, useState } = os.appHooks;

interface GridPortalPaneProps {
  portal: string;
  portalType: "grid" | "map";
  gameContainerCss: string;
}

const GRID_PORTAL_PANE_CSS = `
  .sb-grid-portal-pane {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background:
      radial-gradient(circle at 30% 20%, #f8e7df 0%, transparent 60%),
      radial-gradient(circle at 80% 80%, #ebf1ff 0%, transparent 60%),
      linear-gradient(135deg, #fffaf7, #f8fbff);
  }

  .sb-grid-portal-pane-badge {
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--sb-primary-color), transparent 45%);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 700;
  }

  .sb-grid-portal-pane-name {
    font-size: 16px;
    font-weight: 700;
    color: color-mix(in srgb, var(--sb-font-color), transparent 10%);
  }
`;

function GridPortalPane(props: GridPortalPaneProps) {
  const { portal, portalType, gameContainerCss } = props;
  const portalTitle = portalType === "map" ? "Map Portal" : "Grid Portal";

  return (
    <>
      <style>{GRID_PORTAL_PANE_CSS}</style>
      <div className="sb-grid-portal-pane">
        <div className="sb-grid-portal-pane-badge">{portalTitle}</div>
        <div className="sb-grid-portal-pane-name">{portal}</div>
      </div>
      <CasualOSApp id="grid-portal-pane-positioner">
        <style>{gameContainerCss}</style>
      </CasualOSApp>
    </>
  );
}

function generateGridPortalContainerCss(
  bounds: { left: number; top: number; width: number; height: number } | null,
  borderRadius: string | null
) {
  if (!bounds) {
    return `
      #app-game-container, .main-content {
        position: fixed !important;
        left: 0px !important;
        top: 0px !important;
        width: 0px !important;
        height: 0px !important;
        border-radius: 0px !important;
        overflow: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        z-index: 5 !important;
      }
    `;
  }

  return `
    #app-game-container, .main-content {
      position: fixed !important;
      left: ${Math.round(bounds.left)}px !important;
      top: ${Math.round(bounds.top)}px !important;
      width: ${Math.round(bounds.width)}px !important;
      height: ${Math.round(bounds.height)}px !important;
      border-radius: ${borderRadius || "0px"} !important;
      overflow: hidden !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      z-index: 5 !important;
    }

    .vm-iframe-container {
      position: fixed;
      width: 100vw;
      height: 100vh;
      left: 0;
      top: 0;
    }
  `;
}

function EmptyPaneToolbar({
  toolsManager,
  selectorState,
  panesManager,
  pane,
  tabs,
}: {
  toolsManager: ToolsManager;
  selectorState: BibleSelectorState;
  panesManager: PanesManager;
  pane: Pane;
  tabs: TabsManager;
}) {
  const tools: BibleEmptyPaneTool[] = toolsManager.getEmptyPaneTools({
    selectorState,
    panesManager,
    currentPane: pane,
    tabs,
  });

  return (
    <div className="sb-empty-pane-toolbar">
      {tools.map((tool) => {
        const ToolIcon = tool.icon;
        return tool.visible.value ? (
          <div key={tool.id} className="sb-empty-pane-toolbar-item">
            <button
              disabled={tool.disabled.value}
              onClick={(event: MouseEvent) => {
                event.stopPropagation();
                tool.onSelect();
              }}
              className="sb-empty-pane-toolbar-button"
              title={tool.title}
            >
              <ToolIcon />
              <span className="sb-empty-pane-toolbar-label">{tool.title}</span>
            </button>
          </div>
        ) : null;
      })}
    </div>
  );
}

interface PaneLayoutProps {
  state: SeedBibleState;
}

export function PaneLayout(props: PaneLayoutProps) {
  const { state } = props;
  const {
    app,
    panes: panesManager,
    selector: selectorState,
    tabs: tabsManager,
    sidebar,
    tools: toolsManager,
  } = state;
  const panes = app.effectivePanes.value;
  const layout = app.panelsEnabled.value ? panesManager.layout.value : "single";
  const selectedPaneId = app.panelsEnabled.value
    ? panesManager.selectedPaneId.value
    : (panes[0]?.id ?? null);
  const dragStateRef = useRef<{
    mode: "move" | "resize";
    paneId: string;
    startX: number;
    startY: number;
  } | null>(null);
  const paneElementMapRef = useRef(new Map<string, HTMLElement>());
  const [gridPortalContainerCss, setGridPortalContainerCss] = useState(
    generateGridPortalContainerCss(null, null)
  );
  const attachedPanes = panes.filter((pane) => !pane.detached);
  const detachedPanes = panes.filter((pane) => pane.detached);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      if (dragState.mode === "move") {
        panesManager.movePane(dragState.paneId, deltaX, deltaY);
      } else {
        panesManager.resizePane(dragState.paneId, deltaX, deltaY);
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

  useEffect(() => {
    const syncGridPortalBounds = () => {
      const portalPane =
        panes.find(
          (pane) => pane.gridPortal !== null || pane.mapPortal !== null
        ) ?? null;
      if (!portalPane) {
        setGridPortalContainerCss(generateGridPortalContainerCss(null, null));
        return;
      }

      const paneElement = paneElementMapRef.current.get(portalPane.id);
      if (!paneElement) {
        setGridPortalContainerCss(generateGridPortalContainerCss(null, null));
        return;
      }

      const bounds = paneElement.getBoundingClientRect();
      const paneStyle = window.getComputedStyle(paneElement);
      setGridPortalContainerCss(
        generateGridPortalContainerCss(
          {
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
            height: bounds.height,
          },
          paneStyle.borderRadius || "0px"
        )
      );
    };

    syncGridPortalBounds();
    window.addEventListener("resize", syncGridPortalBounds);
    window.addEventListener("scroll", syncGridPortalBounds, true);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => syncGridPortalBounds());
    paneElementMapRef.current.forEach((element) => observer?.observe(element));

    return () => {
      window.removeEventListener("resize", syncGridPortalBounds);
      window.removeEventListener("scroll", syncGridPortalBounds, true);
      observer?.disconnect();
    };
  }, [panes]);

  return (
    <div className="sb-panes-layout" data-layout={layout}>
      {attachedPanes.map((pane, index) => (
        <div
          key={pane.id}
          className={`sb-pane-shell sb-pane-slot-${index + 1}${
            pane.id === selectedPaneId ? " sb-pane-shell-active" : ""
          }`}
          ref={(element: HTMLElement | null) => {
            if (element) {
              paneElementMapRef.current.set(pane.id, element);
            } else {
              paneElementMapRef.current.delete(pane.id);
            }
          }}
          onClick={() => app.selectPane(pane.id)}
        >
          {pane.gridPortal !== null || pane.mapPortal !== null ? (
            <GridPortalPane
              portal={pane.gridPortal ?? pane.mapPortal ?? ""}
              portalType={pane.mapPortal !== null ? "map" : "grid"}
              gameContainerCss={gridPortalContainerCss}
            />
          ) : pane.component !== null ? (
            <div className="sb-pane-component">{pane.component}</div>
          ) : pane.tab ? (
            <div className="sb-pane-reader">
              <BibleReader
                currentPane={pane}
                readingState={pane.tab.readingState}
                selectorState={selectorState}
              />
              <BelowReaderToolbar
                toolsManager={toolsManager}
                readingState={pane.tab.readingState}
                selectorState={selectorState}
                tabsManager={tabsManager}
                panesManager={panesManager}
                openSidebar={sidebar.openSidebar}
                currentPane={pane}
              />
            </div>
          ) : (
            <EmptyPaneToolbar
              toolsManager={toolsManager}
              selectorState={selectorState}
              panesManager={panesManager}
              pane={pane}
              tabs={tabsManager}
            />
          )}
        </div>
      ))}

      {detachedPanes.map((pane, index) => (
        <div
          key={pane.id}
          className={`sb-pane-shell sb-pane-shell-detached${
            pane.id === selectedPaneId ? " sb-pane-shell-active" : ""
          }`}
          style={{
            left: `${pane.x}px`,
            top: `${pane.y}px`,
            width: `${pane.width}px`,
            height: `${pane.height}px`,
            zIndex:
              pane.id === selectedPaneId
                ? 40 + detachedPanes.length
                : 20 + index,
          }}
          ref={(element: HTMLElement | null) => {
            if (element) {
              paneElementMapRef.current.set(pane.id, element);
            } else {
              paneElementMapRef.current.delete(pane.id);
            }
          }}
          onPointerDown={() => app.selectPane(pane.id)}
        >
          <div
            className="sb-pane-detached-header"
            onPointerDown={(event: PointerEvent) => {
              event.stopPropagation();
              app.selectPane(pane.id);
              dragStateRef.current = {
                mode: "move",
                paneId: pane.id,
                startX: event.clientX,
                startY: event.clientY,
              };
            }}
          >
            <span className="sb-pane-detached-title">Detached Pane</span>
            <button
              className="sb-pane-detached-close-button"
              aria-label="Close detached pane"
              title="Close"
              onPointerDown={(event: PointerEvent) => {
                event.stopPropagation();
              }}
              onClick={(event: MouseEvent) => {
                event.stopPropagation();
                panesManager.closeDetachedPane(pane.id);
              }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="sb-pane-detached-body">
            {pane.gridPortal !== null || pane.mapPortal !== null ? (
              <GridPortalPane
                portal={pane.gridPortal ?? pane.mapPortal ?? ""}
                portalType={pane.mapPortal !== null ? "map" : "grid"}
                gameContainerCss={gridPortalContainerCss}
              />
            ) : pane.component !== null ? (
              <div className="sb-pane-component">{pane.component}</div>
            ) : pane.tab ? (
              <div className="sb-pane-reader">
                <BibleReader
                  currentPane={pane}
                  readingState={pane.tab.readingState}
                  selectorState={selectorState}
                />
              </div>
            ) : (
              <EmptyPaneToolbar
                toolsManager={toolsManager}
                selectorState={selectorState}
                panesManager={panesManager}
                pane={pane}
                tabs={tabsManager}
              />
            )}
          </div>

          <div
            className="sb-pane-detached-resize-handle"
            onPointerDown={(event: PointerEvent) => {
              event.stopPropagation();
              app.selectPane(pane.id);
              dragStateRef.current = {
                mode: "resize",
                paneId: pane.id,
                startX: event.clientX,
                startY: event.clientY,
              };
            }}
          />
        </div>
      ))}
    </div>
  );
}
