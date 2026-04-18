import { BibleReader } from "seed-bible.components.BibleReader";
import { BelowReaderToolbar } from "seed-bible.components.BelowReaderToolbar";
import { CasualOSApp } from "seed-bible.components.CasualOSApp";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { ReaderTab, TabsManager } from "seed-bible.managers.TabsManager";
import type {
  DetachedPaneAnchor,
  Pane,
  PanesManager,
} from "seed-bible.managers.PanesManager";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { type ToolsManager } from "seed-bible.managers.BibleToolsManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import { effect } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { translateTitle } from "seed-bible.components.Utils";

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
      padding: 6px !important;
    }

    .vm-iframe-container {
      position: fixed;
      width: 100vw;
      height: 100vh;
      left: 0;
      top: 0;
    }

    .vm-iframe-container.game-view-visible iframe:first-child {
      pointer-events: auto !important;
    }
  `;
}

interface PaneReaderScrollerProps {
  tab: ReaderTab;
  children: ComponentChildren;
}

function PaneReaderScroller({ tab, children }: PaneReaderScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const currentChapter = useRef(tab.readingState.chapterData.value);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }

    const cancel = effect(() => {
      const el = scrollerRef.current;
      if (!el) {
        return;
      }

      if (tab.readingState.chapterData.value) {
        el.scrollTop = tab.readingState.scrollPosition.peek();
      }

      currentChapter.current = tab.readingState.chapterData.value;
    });

    const handleScroll = () => {
      if (
        currentChapter.current?.translation.id !==
          tab.readingState.translationId.value ||
        currentChapter.current?.book.id !== tab.readingState.bookId.value ||
        currentChapter.current?.chapter.number !==
          tab.readingState.chapterNumber.value
      ) {
        return;
      }
      tab.readingState.scrollPosition.value = el.scrollTop;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      cancel();
      el.removeEventListener("scroll", handleScroll);
    };
  }, [tab.id]);

  return (
    <div className="sb-pane-reader" ref={scrollerRef}>
      {children}
    </div>
  );
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
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const tools = toolsManager.getEmptyPaneTools({
    selectorState,
    panesManager,
    currentPane: pane,
    tabs,
  });

  const { t } = useI18n();

  return (
    <div className="sb-empty-pane-toolbar">
      {tools.map((tool) => {
        const title = translateTitle(t, tool.title);
        const ToolIcon = tool.icon;
        const menuItems =
          tool.getItems?.().filter((item) => item.visible.value) ?? [];
        const hasMenuItems = menuItems.length > 0;
        return tool.visible.value ? (
          <div key={tool.id} className="sb-empty-pane-toolbar-item">
            <button
              disabled={tool.disabled.value}
              onClick={(event: MouseEvent) => {
                event.stopPropagation();
                if (hasMenuItems) {
                  setSelectedToolId((prev) =>
                    prev === tool.id ? null : tool.id
                  );
                  return;
                }

                setSelectedToolId(null);
                tool.onSelect();
              }}
              className="sb-empty-pane-toolbar-button"
              title={title}
            >
              <ToolIcon />
              <span className="sb-empty-pane-toolbar-label">{title}</span>
            </button>
            {hasMenuItems && selectedToolId === tool.id && (
              <div className="sb-tool-context-menu">
                {menuItems.map((item) => {
                  const MenuItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      disabled={item.disabled.value}
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation();
                        item.onSelect();
                        setSelectedToolId(null);
                      }}
                      className="sb-tool-context-menu-item"
                    >
                      <MenuItemIcon />
                      <span>{translateTitle(t, item.title)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null;
      })}
    </div>
  );
}

function getLayoutGridDimensions(layout: string): {
  cols: number;
  rows: number;
} {
  switch (layout) {
    case "split-2v":
      return { cols: 2, rows: 1 };
    case "split-3v":
      return { cols: 3, rows: 1 };
    case "split-4v":
      return { cols: 4, rows: 1 };
    case "grid-2x2":
      return { cols: 2, rows: 2 };
    case "split-left-two-right":
      return { cols: 2, rows: 2 };
    default:
      return { cols: 1, rows: 1 };
  }
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
    anchor?: DetachedPaneAnchor;
  } | null>(null);
  const paneElementMapRef = useRef(new Map<string, HTMLElement>());
  const [gridPortalContainerCss, setGridPortalContainerCss] = useState(
    generateGridPortalContainerCss(null, null)
  );
  const attachedPanes = panes.filter((pane) => !pane.detached);
  const detachedPanes = panes.filter((pane) => pane.detached);

  const layoutContainerRef = useRef<HTMLDivElement | null>(null);
  const { cols: layoutCols, rows: layoutRows } =
    getLayoutGridDimensions(layout);
  const [columnSizes, setColumnSizes] = useState<number[]>(() =>
    Array.from({ length: layoutCols }, () => 1 / layoutCols)
  );
  const [rowSizes, setRowSizes] = useState<number[]>(() =>
    Array.from({ length: layoutRows }, () => 1 / layoutRows)
  );
  const attachedResizeDragRef = useRef<{
    type: "column" | "row";
    index: number;
    startPos: number;
    startSizes: number[];
  } | null>(null);

  const effectiveColumnSizes =
    columnSizes.length === layoutCols
      ? columnSizes
      : Array.from({ length: layoutCols }, () => 1 / layoutCols);
  const effectiveRowSizes =
    rowSizes.length === layoutRows
      ? rowSizes
      : Array.from({ length: layoutRows }, () => 1 / layoutRows);

  useEffect(() => {
    setColumnSizes(Array.from({ length: layoutCols }, () => 1 / layoutCols));
    setRowSizes(Array.from({ length: layoutRows }, () => 1 / layoutRows));
  }, [layout]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      // Handle attached pane resize
      const resizeDrag = attachedResizeDragRef.current;
      if (resizeDrag) {
        event.preventDefault();
        const container = layoutContainerRef.current;
        if (!container) {
          return;
        }
        const rect = container.getBoundingClientRect();

        if (resizeDrag.type === "column") {
          const left = resizeDrag.startSizes[resizeDrag.index] ?? 0;
          const right = resizeDrag.startSizes[resizeDrag.index + 1] ?? 0;
          const deltaFrac = (event.clientX - resizeDrag.startPos) / rect.width;
          const newLeft = left + deltaFrac;
          const newRight = right - deltaFrac;
          const minFrac = 80 / rect.width;
          if (newLeft >= minFrac && newRight >= minFrac) {
            const next = [...resizeDrag.startSizes];
            next[resizeDrag.index] = newLeft;
            next[resizeDrag.index + 1] = newRight;
            setColumnSizes(next);
          }
        } else {
          const top = resizeDrag.startSizes[resizeDrag.index] ?? 0;
          const bottom = resizeDrag.startSizes[resizeDrag.index + 1] ?? 0;
          const deltaFrac = (event.clientY - resizeDrag.startPos) / rect.height;
          const newTop = top + deltaFrac;
          const newBottom = bottom - deltaFrac;
          const minFrac = 60 / rect.height;
          if (newTop >= minFrac && newBottom >= minFrac) {
            const next = [...resizeDrag.startSizes];
            next[resizeDrag.index] = newTop;
            next[resizeDrag.index + 1] = newBottom;
            setRowSizes(next);
          }
        }
        return;
      }

      // Handle detached pane drag
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const deltaX =
        dragState.anchor === "side"
          ? dragState.startX - event.clientX
          : event.clientX - dragState.startX;
      const deltaY =
        dragState.anchor === "bottom"
          ? dragState.startY - event.clientY
          : event.clientY - dragState.startY;

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
      attachedResizeDragRef.current = null;
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

      const targetElement = portalPane.detached
        ? ((paneElement.querySelector(
            ".sb-pane-detached-body"
          ) as HTMLElement | null) ?? paneElement)
        : paneElement;

      const bounds = targetElement.getBoundingClientRect();
      const paneStyle = window.getComputedStyle(targetElement);
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
    <div
      className="sb-panes-layout"
      data-layout={layout}
      ref={layoutContainerRef}
      style={{
        ...(layoutCols > 1
          ? {
              gridTemplateColumns: effectiveColumnSizes
                .map((s) => `minmax(0,${s}fr)`)
                .join(" "),
            }
          : {}),
        ...(layoutRows > 1
          ? {
              gridTemplateRows: effectiveRowSizes
                .map((s) => `minmax(0,${s}fr)`)
                .join(" "),
            }
          : {}),
      }}
    >
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
            <div className="sb-pane-component">
              <pane.component />
            </div>
          ) : pane.tab ? (
            <PaneReaderScroller tab={pane.tab}>
              <BibleReader
                currentPane={pane}
                readingState={pane.tab.readingState}
                selectorState={selectorState}
              />
              <BelowReaderToolbar
                toolsManager={toolsManager}
                readingState={pane.tab.readingState}
                sharedSession={pane.tab.sharedSession}
                selectorState={selectorState}
                tabsManager={tabsManager}
                panesManager={panesManager}
                openSidebar={sidebar.openSidebar}
                currentPane={pane}
              />
            </PaneReaderScroller>
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

      {layoutCols > 1 &&
        effectiveColumnSizes.slice(0, -1).map((_, i) => {
          const leftPercent =
            effectiveColumnSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) *
            100;
          return (
            <div
              key={`col-resize-${i}`}
              className="sb-pane-resize-handle sb-pane-resize-handle-col"
              style={{ left: `calc(${leftPercent}% - 3px)` }}
              onPointerDown={(event: PointerEvent) => {
                event.preventDefault();
                event.stopPropagation();
                attachedResizeDragRef.current = {
                  type: "column",
                  index: i,
                  startPos: event.clientX,
                  startSizes: [...effectiveColumnSizes],
                };
              }}
            />
          );
        })}

      {layoutRows > 1 &&
        effectiveRowSizes.slice(0, -1).map((_, i) => {
          const topPercent =
            effectiveRowSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) * 100;
          return (
            <div
              key={`row-resize-${i}`}
              className="sb-pane-resize-handle sb-pane-resize-handle-row"
              style={{
                top: `calc(${topPercent}% - 3px)`,
                left:
                  layout === "split-left-two-right"
                    ? `${effectiveColumnSizes[0]! * 100}%`
                    : "0",
                right: "0",
              }}
              onPointerDown={(event: PointerEvent) => {
                event.preventDefault();
                event.stopPropagation();
                attachedResizeDragRef.current = {
                  type: "row",
                  index: i,
                  startPos: event.clientY,
                  startSizes: [...effectiveRowSizes],
                };
              }}
            />
          );
        })}

      {detachedPanes.map((pane, index) => (
        <div
          key={pane.id}
          className={`sb-pane-shell sb-pane-shell-detached${
            pane.detachedAnchor !== "floating"
              ? " sb-pane-shell-detached-anchored"
              : ""
          }${pane.id === selectedPaneId ? " sb-pane-shell-active" : ""}`}
          data-anchor={pane.detachedAnchor}
          style={{
            ...(pane.detachedAnchor === "side"
              ? {
                  position: "fixed",
                  top: "0px",
                  right: "0px",
                  bottom: "0px",
                  left: "auto",
                  width: `${pane.width}px`,
                  height: "auto",
                }
              : pane.detachedAnchor === "bottom"
                ? {
                    position: "fixed",
                    left: "0px",
                    right: "0px",
                    bottom: "0px",
                    top: "auto",
                    width: "auto",
                    height: `${pane.height}px`,
                  }
                : {
                    left: `${pane.x}px`,
                    top: `${pane.y}px`,
                    width: `${pane.width}px`,
                    height: `${pane.height}px`,
                  }),
            zIndex:
              pane.id === selectedPaneId
                ? 70 + detachedPanes.length
                : 50 + index,
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
          <div className="sb-pane-detached-body">
            {pane.gridPortal !== null || pane.mapPortal !== null ? (
              <GridPortalPane
                portal={pane.gridPortal ?? pane.mapPortal ?? ""}
                portalType={pane.mapPortal !== null ? "map" : "grid"}
                gameContainerCss={gridPortalContainerCss}
              />
            ) : pane.component !== null ? (
              <div className="sb-pane-component">
                <pane.component />
              </div>
            ) : pane.tab ? (
              <PaneReaderScroller tab={pane.tab}>
                <BibleReader
                  currentPane={pane}
                  readingState={pane.tab.readingState}
                  selectorState={selectorState}
                />
              </PaneReaderScroller>
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
            className="sb-detached-pane-toolbar"
            onPointerDown={(event: PointerEvent) => {
              if (pane.detachedAnchor !== "floating") {
                return;
              }
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
            <div className="sb-detached-pane-toolbar-item">
              <button
                className={`sb-detached-pane-toolbar-button${
                  pane.detachedAnchor === "side"
                    ? " sb-detached-pane-toolbar-button-active"
                    : ""
                }`}
                aria-label="Anchor detached pane to side"
                title="Anchor to side"
                onPointerDown={(event: PointerEvent) => {
                  event.stopPropagation();
                }}
                onClick={(event: MouseEvent) => {
                  event.stopPropagation();
                  panesManager.setDetachedAnchor(pane.id, "side");
                }}
              >
                <span className="material-symbols-outlined">
                  right_panel_open
                </span>
                <span className="sr-only">Anchor to side</span>
              </button>
            </div>

            <div className="sb-detached-pane-toolbar-item">
              <button
                className={`sb-detached-pane-toolbar-button${
                  pane.detachedAnchor === "bottom"
                    ? " sb-detached-pane-toolbar-button-active"
                    : ""
                }`}
                aria-label="Anchor detached pane to bottom"
                title="Anchor to bottom"
                onPointerDown={(event: PointerEvent) => {
                  event.stopPropagation();
                }}
                onClick={(event: MouseEvent) => {
                  event.stopPropagation();
                  panesManager.setDetachedAnchor(pane.id, "bottom");
                }}
              >
                <span className="material-symbols-outlined">
                  bottom_panel_open
                </span>
                <span className="sr-only">Anchor to bottom</span>
              </button>
            </div>

            <div className="sb-detached-pane-toolbar-item">
              <button
                className="sb-detached-pane-toolbar-button"
                aria-label="Close detached pane"
                title="Close"
                onPointerDown={(event: PointerEvent) => {
                  event.stopPropagation();
                }}
                onClick={(event: MouseEvent) => {
                  event.stopPropagation();
                  panesManager.closePane(pane.id);
                }}
              >
                <span className="material-symbols-outlined">close</span>
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>

          <div
            className={`sb-pane-detached-resize-handle${
              pane.detachedAnchor === "side"
                ? " sb-pane-detached-resize-handle-side"
                : pane.detachedAnchor === "bottom"
                  ? " sb-pane-detached-resize-handle-bottom"
                  : ""
            }`}
            onPointerDown={(event: PointerEvent) => {
              event.stopPropagation();
              app.selectPane(pane.id);
              dragStateRef.current = {
                mode: "resize",
                paneId: pane.id,
                anchor: pane.detachedAnchor,
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
