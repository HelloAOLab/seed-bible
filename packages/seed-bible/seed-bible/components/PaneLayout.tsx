import { BibleReader } from "seed-bible.components.BibleReader";
import { BelowReaderToolbar } from "seed-bible.components.BelowReaderToolbar";
import { CasualOSApp } from "seed-bible.components.CasualOSApp";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { ReaderTab, TabsManager } from "seed-bible.managers.TabsManager";
import type {
  DetachedPaneAnchor,
  Pane,
  PaneLayoutId,
  PanesManager,
} from "seed-bible.managers.PanesManager";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { type ToolsManager } from "seed-bible.managers.BibleToolsManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import { effect } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { translateTitle } from "seed-bible.components.Utils";
import { MaterialIcon } from "seed-bible.components.icons";

const { useEffect, useRef, useState } = os.appHooks;

const ATTACHED_PANE_MIN_SIZE_PX = 180;
const ATTACHED_RESIZE_HANDLE_SIZE_PX = 14;

type MultiPaneLayoutId = Exclude<PaneLayoutId, "single">;

interface AttachedPaneSizesState {
  "split-2v": { columns: number[] };
  "split-left-two-right": { columns: number[]; rows: number[] };
  "split-3v": { columns: number[] };
  "grid-2x2": { columns: number[]; rows: number[] };
  "split-4v": { columns: number[] };
}

type AttachedResizeHandleDescriptor = {
  id: string;
  axis: "x" | "y";
  ratio: number;
  crossStart: number;
  crossEnd: number;
};

const DEFAULT_ATTACHED_PANE_SIZES: AttachedPaneSizesState = {
  "split-2v": { columns: [1, 1] },
  "split-left-two-right": { columns: [1.2, 1], rows: [1, 1] },
  "split-3v": { columns: [1, 1, 1] },
  "grid-2x2": { columns: [1, 1], rows: [1, 1] },
  "split-4v": { columns: [1, 1, 1, 1] },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toGridTrack(value: number) {
  return `minmax(0, ${value}fr)`;
}

function getRatioAtIndex(values: number[], index: number) {
  const total = values.reduce((sum, current) => sum + current, 0);
  if (total <= 0) {
    return 0;
  }

  const before = values
    .slice(0, index + 1)
    .reduce((sum, current) => sum + current, 0);
  return clamp(before / total, 0, 1);
}

function resizeAdjacentTracks(
  tracks: number[],
  index: number,
  deltaPx: number,
  containerSizePx: number
) {
  if (index < 0 || index >= tracks.length - 1 || containerSizePx <= 0) {
    return tracks;
  }

  const nextTracks = [...tracks];
  const currentTrack = tracks[index] ?? 0;
  const adjacentTrack = tracks[index + 1] ?? 0;
  const pairTotal = currentTrack + adjacentTrack;
  const minimumTrack =
    (ATTACHED_PANE_MIN_SIZE_PX / containerSizePx) * pairTotal;
  const boundedMinimumTrack = clamp(minimumTrack, 0.05, pairTotal / 2 - 0.0001);
  if (boundedMinimumTrack * 2 >= pairTotal) {
    return tracks;
  }

  const deltaTrack = (deltaPx / containerSizePx) * pairTotal;
  const nextCurrentTrack = clamp(
    currentTrack + deltaTrack,
    boundedMinimumTrack,
    pairTotal - boundedMinimumTrack
  );

  nextTracks[index] = nextCurrentTrack;
  nextTracks[index + 1] = pairTotal - nextCurrentTrack;
  return nextTracks;
}

function getAttachedResizeHandles(
  layout: PaneLayoutId,
  attachedPaneSizes: AttachedPaneSizesState
): AttachedResizeHandleDescriptor[] {
  if (layout === "split-2v") {
    return [
      {
        id: "col-0",
        axis: "x",
        ratio: getRatioAtIndex(attachedPaneSizes["split-2v"].columns, 0),
        crossStart: 0,
        crossEnd: 1,
      },
    ];
  }

  if (layout === "split-3v") {
    return [0, 1].map((index) => ({
      id: `col-${index}`,
      axis: "x" as const,
      ratio: getRatioAtIndex(attachedPaneSizes["split-3v"].columns, index),
      crossStart: 0,
      crossEnd: 1,
    }));
  }

  if (layout === "split-4v") {
    return [0, 1, 2].map((index) => ({
      id: `col-${index}`,
      axis: "x" as const,
      ratio: getRatioAtIndex(attachedPaneSizes["split-4v"].columns, index),
      crossStart: 0,
      crossEnd: 1,
    }));
  }

  if (layout === "grid-2x2") {
    return [
      {
        id: "col-0",
        axis: "x",
        ratio: getRatioAtIndex(attachedPaneSizes["grid-2x2"].columns, 0),
        crossStart: 0,
        crossEnd: 1,
      },
      {
        id: "row-0",
        axis: "y",
        ratio: getRatioAtIndex(attachedPaneSizes["grid-2x2"].rows, 0),
        crossStart: 0,
        crossEnd: 1,
      },
    ];
  }

  if (layout === "split-left-two-right") {
    const columnRatio = getRatioAtIndex(
      attachedPaneSizes["split-left-two-right"].columns,
      0
    );

    return [
      {
        id: "col-0",
        axis: "x",
        ratio: columnRatio,
        crossStart: 0,
        crossEnd: 1,
      },
      {
        id: "row-0",
        axis: "y",
        ratio: getRatioAtIndex(
          attachedPaneSizes["split-left-two-right"].rows,
          0
        ),
        crossStart: columnRatio,
        crossEnd: 1,
      },
    ];
  }

  return [];
}

function getAttachedLayoutStyle(
  layout: PaneLayoutId,
  attachedPaneSizes: AttachedPaneSizesState
) {
  if (layout === "split-2v") {
    return {
      gridTemplateColumns: attachedPaneSizes["split-2v"].columns
        .map(toGridTrack)
        .join(" "),
    };
  }

  if (layout === "split-left-two-right") {
    return {
      gridTemplateColumns: attachedPaneSizes["split-left-two-right"].columns
        .map(toGridTrack)
        .join(" "),
      gridTemplateRows: attachedPaneSizes["split-left-two-right"].rows
        .map(toGridTrack)
        .join(" "),
    };
  }

  if (layout === "split-3v") {
    return {
      gridTemplateColumns: attachedPaneSizes["split-3v"].columns
        .map(toGridTrack)
        .join(" "),
    };
  }

  if (layout === "grid-2x2") {
    return {
      gridTemplateColumns: attachedPaneSizes["grid-2x2"].columns
        .map(toGridTrack)
        .join(" "),
      gridTemplateRows: attachedPaneSizes["grid-2x2"].rows
        .map(toGridTrack)
        .join(" "),
    };
  }

  if (layout === "split-4v") {
    return {
      gridTemplateColumns: attachedPaneSizes["split-4v"].columns
        .map(toGridTrack)
        .join(" "),
    };
  }

  return {};
}

interface GridPortalPaneProps {
  portal: string;
  portalType: "grid" | "map";
  gameContainerCss: string;
}

const FULLSCREEN_EXIT_BUTTON_CSS = `
  .sb-fullscreen-exit-wrapper {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 1000;
    pointer-events: auto;
  }

  .sb-fullscreen-exit-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: none;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.72);
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.32);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
  }

  .sb-fullscreen-exit-button:hover {
    background: rgba(0, 0, 0, 0.88);
  }

  .sb-fullscreen-exit-button .material-symbols-outlined {
    font-size: 18px;
  }
`;

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
    config: configManager,
  } = state;
  const panes = app.effectivePanes.value;
  const layout = app.panelsEnabled.value ? panesManager.layout.value : "single";
  const selectedPaneId = app.panelsEnabled.value
    ? panesManager.selectedPaneId.value
    : (panes[0]?.id ?? null);
  const dragStateRef = useRef<
    | {
        type: "detached";
        mode: "move" | "resize";
        paneId: string;
        startX: number;
        startY: number;
        anchor?: DetachedPaneAnchor;
      }
    | {
        type: "attached-resize";
        layout: MultiPaneLayoutId;
        splitterId: string;
        axis: "x" | "y";
        startClient: number;
        containerSizePx: number;
        startSizes: AttachedPaneSizesState;
      }
    | null
  >(null);
  const attachedLayoutRef = useRef<HTMLDivElement | null>(null);
  const paneElementMapRef = useRef(new Map<string, HTMLElement>());
  const [attachedPaneSizes, setAttachedPaneSizes] =
    useState<AttachedPaneSizesState>(DEFAULT_ATTACHED_PANE_SIZES);
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

      if (dragState.type === "attached-resize") {
        const deltaPx =
          dragState.axis === "x"
            ? event.clientX - dragState.startClient
            : event.clientY - dragState.startClient;
        const splitterIndex = Number.parseInt(
          dragState.splitterId.split("-")[1] ?? "-1",
          10
        );

        setAttachedPaneSizes((previousSizes) => {
          const baseSizes = dragState.startSizes;

          if (dragState.layout === "split-2v") {
            return {
              ...previousSizes,
              "split-2v": {
                columns: resizeAdjacentTracks(
                  baseSizes["split-2v"].columns,
                  0,
                  deltaPx,
                  dragState.containerSizePx
                ),
              },
            };
          }

          if (dragState.layout === "split-left-two-right") {
            if (dragState.splitterId === "col-0") {
              return {
                ...previousSizes,
                "split-left-two-right": {
                  ...previousSizes["split-left-two-right"],
                  columns: resizeAdjacentTracks(
                    baseSizes["split-left-two-right"].columns,
                    0,
                    deltaPx,
                    dragState.containerSizePx
                  ),
                },
              };
            }

            return {
              ...previousSizes,
              "split-left-two-right": {
                ...previousSizes["split-left-two-right"],
                rows: resizeAdjacentTracks(
                  baseSizes["split-left-two-right"].rows,
                  0,
                  deltaPx,
                  dragState.containerSizePx
                ),
              },
            };
          }

          if (dragState.layout === "split-3v") {
            return {
              ...previousSizes,
              "split-3v": {
                columns: resizeAdjacentTracks(
                  baseSizes["split-3v"].columns,
                  splitterIndex,
                  deltaPx,
                  dragState.containerSizePx
                ),
              },
            };
          }

          if (dragState.layout === "grid-2x2") {
            if (dragState.splitterId === "col-0") {
              return {
                ...previousSizes,
                "grid-2x2": {
                  ...previousSizes["grid-2x2"],
                  columns: resizeAdjacentTracks(
                    baseSizes["grid-2x2"].columns,
                    0,
                    deltaPx,
                    dragState.containerSizePx
                  ),
                },
              };
            }

            return {
              ...previousSizes,
              "grid-2x2": {
                ...previousSizes["grid-2x2"],
                rows: resizeAdjacentTracks(
                  baseSizes["grid-2x2"].rows,
                  0,
                  deltaPx,
                  dragState.containerSizePx
                ),
              },
            };
          }

          return {
            ...previousSizes,
            "split-4v": {
              columns: resizeAdjacentTracks(
                baseSizes["split-4v"].columns,
                splitterIndex,
                deltaPx,
                dragState.containerSizePx
              ),
            },
          };
        });
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

  const { t } = useI18n();
  const attachedResizeHandles = getAttachedResizeHandles(
    layout,
    attachedPaneSizes
  );
  const attachedLayoutStyle = getAttachedLayoutStyle(layout, attachedPaneSizes);

  return (
    <div
      className="sb-panes-layout"
      data-layout={layout}
      style={attachedLayoutStyle}
      ref={attachedLayoutRef}
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
                scriptureSettings={{
                  scriptureFontSize:
                    configManager.config.value.scriptureFontSize,
                  scriptureLineSpacing:
                    configManager.config.value.scriptureLineSpacing,
                  scriptureShowHeadings:
                    configManager.config.value.scriptureShowHeadings,
                  scriptureShowVerseNumbers:
                    configManager.config.value.scriptureShowVerseNumbers,
                  scriptureShowFootnotes:
                    configManager.config.value.scriptureShowFootnotes,
                  scriptureShowHighlights:
                    configManager.config.value.scriptureShowHighlights,
                }}
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

      {layout !== "single" &&
        attachedResizeHandles.map((handle) => {
          const ratio = clamp(handle.ratio, 0, 1);
          const crossStart = clamp(handle.crossStart, 0, 1);
          const crossEnd = clamp(handle.crossEnd, crossStart, 1);
          const vertical = handle.axis === "x";

          return (
            <div
              key={handle.id}
              className={`sb-attached-pane-resize-handle ${
                vertical
                  ? "sb-attached-pane-resize-handle-vertical"
                  : "sb-attached-pane-resize-handle-horizontal"
              }`}
              style={
                vertical
                  ? {
                      left: `calc(${(ratio * 100).toFixed(4)}% - ${ATTACHED_RESIZE_HANDLE_SIZE_PX / 2}px)`,
                      top: `${(crossStart * 100).toFixed(4)}%`,
                      height: `${((crossEnd - crossStart) * 100).toFixed(4)}%`,
                      width: `${ATTACHED_RESIZE_HANDLE_SIZE_PX}px`,
                    }
                  : {
                      top: `calc(${(ratio * 100).toFixed(4)}% - ${ATTACHED_RESIZE_HANDLE_SIZE_PX / 2}px)`,
                      left: `${(crossStart * 100).toFixed(4)}%`,
                      width: `${((crossEnd - crossStart) * 100).toFixed(4)}%`,
                      height: `${ATTACHED_RESIZE_HANDLE_SIZE_PX}px`,
                    }
              }
              onPointerDown={(event: PointerEvent) => {
                event.stopPropagation();
                event.preventDefault();

                const container = attachedLayoutRef.current;
                if (!container) {
                  return;
                }

                const bounds = container.getBoundingClientRect();
                const containerSizePx =
                  handle.axis === "x" ? bounds.width : bounds.height;
                if (containerSizePx <= 0) {
                  return;
                }

                dragStateRef.current = {
                  type: "attached-resize",
                  layout,
                  splitterId: handle.id,
                  axis: handle.axis,
                  startClient:
                    handle.axis === "x" ? event.clientX : event.clientY,
                  containerSizePx,
                  startSizes: attachedPaneSizes,
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
            ...(pane.detachedAnchor === "fullscreen"
              ? {
                  position: "fixed",
                  top: "0px",
                  left: "0px",
                  right: "0px",
                  bottom: "0px",
                  width: "100%",
                  height: "100%",
                }
              : pane.detachedAnchor === "side"
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
              pane.detachedAnchor === "fullscreen"
                ? 100
                : pane.id === selectedPaneId
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
                  scriptureSettings={{
                    scriptureFontSize:
                      configManager.config.value.scriptureFontSize,
                    scriptureLineSpacing:
                      configManager.config.value.scriptureLineSpacing,
                    scriptureShowHeadings:
                      configManager.config.value.scriptureShowHeadings,
                    scriptureShowVerseNumbers:
                      configManager.config.value.scriptureShowVerseNumbers,
                    scriptureShowFootnotes:
                      configManager.config.value.scriptureShowFootnotes,
                    scriptureShowHighlights:
                      configManager.config.value.scriptureShowHighlights,
                  }}
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
            {pane.detachedAnchor === "floating" && (
              <div
                className={`sb-pane-detached-resize-handle`}
                onPointerDown={(event: PointerEvent) => {
                  event.stopPropagation();
                  event.preventDefault();
                  app.selectPane(pane.id);
                  dragStateRef.current = {
                    type: "detached",
                    mode: "resize",
                    paneId: pane.id,
                    anchor: pane.detachedAnchor,
                    startX: event.clientX,
                    startY: event.clientY,
                  };
                }}
              ></div>
            )}
          </div>

          {pane.detachedAnchor === "fullscreen" && (
            <CasualOSApp id={`pane-fullscreen-exit-${pane.id}`}>
              <>
                <style>{FULLSCREEN_EXIT_BUTTON_CSS}</style>
                <div className="sb-fullscreen-exit-wrapper">
                  <button
                    className="sb-fullscreen-exit-button"
                    onClick={() =>
                      panesManager.setDetachedAnchor(pane.id, "floating")
                    }
                  >
                    <span className="material-symbols-outlined">
                      fullscreen_exit
                    </span>
                    <span>Exit Full Screen</span>
                  </button>
                </div>
              </>
            </CasualOSApp>
          )}

          {pane.detachedAnchor !== "fullscreen" && (
            <div
              className="sb-detached-pane-toolbar"
              onPointerDown={(event: PointerEvent) => {
                if (pane.detachedAnchor !== "floating") {
                  return;
                }
                event.stopPropagation();
                app.selectPane(pane.id);
                dragStateRef.current = {
                  type: "detached",
                  mode: "move",
                  paneId: pane.id,
                  startX: event.clientX,
                  startY: event.clientY,
                };
              }}
            >
              {pane.detachedAnchor === "floating" && (
                <>
                  <div className="sb-detached-pane-toolbar-item">
                    <button
                      className="sb-detached-pane-toolbar-button"
                      aria-label={t("small-window")}
                      title={t("small-window")}
                      onPointerDown={(event: PointerEvent) => {
                        event.stopPropagation();
                      }}
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation();
                        panesManager.resizePane(
                          pane.id,
                          400 - pane.width,
                          300 - pane.height
                        );
                      }}
                    >
                      <span className="material-symbols-outlined">
                        magnification_small
                      </span>
                      <span className="sr-only">{t("small-window")}</span>
                    </button>
                  </div>
                  <div className="sb-detached-pane-toolbar-item">
                    <button
                      className="sb-detached-pane-toolbar-button"
                      aria-label={t("large-window")}
                      title={t("large-window")}
                      onPointerDown={(event: PointerEvent) => {
                        event.stopPropagation();
                      }}
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation();
                        panesManager.resizePane(
                          pane.id,
                          600 - pane.width,
                          400 - pane.height
                        );
                      }}
                    >
                      <span className="material-symbols-outlined">
                        magnification_large
                      </span>
                      <span className="sr-only">{t("large-window")}</span>
                    </button>
                  </div>
                </>
              )}

              <div className="sb-detached-pane-toolbar-item">
                <button
                  className="sb-detached-pane-toolbar-button"
                  aria-label={t("toggle-fullscreen-panel")}
                  title={t("fullscreen")}
                  onPointerDown={(event: PointerEvent) => {
                    event.stopPropagation();
                  }}
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation();
                    panesManager.setDetachedAnchor(
                      pane.id,
                      pane.detachedAnchor === "fullscreen"
                        ? "floating"
                        : "fullscreen"
                    );
                  }}
                >
                  <span className="material-symbols-outlined">fullscreen</span>
                  <span className="sr-only">{t("fullscreen")}</span>
                </button>
              </div>

              {pane.detachedAnchor !== "side" && (
                <div className="sb-detached-pane-toolbar-item">
                  <button
                    className="sb-detached-pane-toolbar-button"
                    aria-label={t("anchor-to-side")}
                    title={t("anchor-to-side")}
                    onPointerDown={(event: PointerEvent) => {
                      event.stopPropagation();
                    }}
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation();
                      panesManager.setDetachedAnchor(pane.id, "side");
                    }}
                  >
                    <span className="material-symbols-outlined flip-x">
                      right_panel_open
                    </span>
                    <span className="sr-only">{t("anchor-to-side")}</span>
                  </button>
                </div>
              )}

              {pane.detachedAnchor !== "floating" && (
                <div className="sb-detached-pane-toolbar-item">
                  <button
                    className="sb-detached-pane-toolbar-button"
                    aria-label={t("return-to-floating-window")}
                    title={t("return-to-floating-window")}
                    onPointerDown={(event: PointerEvent) => {
                      event.stopPropagation();
                    }}
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation();
                      panesManager.setDetachedAnchor(pane.id, "floating");
                    }}
                  >
                    <span className="material-symbols-outlined">
                      open_in_new
                    </span>
                    <span className="sr-only">
                      {t("return-to-floating-window")}
                    </span>
                  </button>
                </div>
              )}

              <div className="sb-detached-pane-toolbar-item">
                <button
                  className="sb-detached-pane-toolbar-button"
                  aria-label={t("close-panel")}
                  title={t("close")}
                  onPointerDown={(event: PointerEvent) => {
                    event.stopPropagation();
                  }}
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation();
                    panesManager.closePane(pane.id);
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                  <span className="sr-only">{t("close")}</span>
                </button>
              </div>
            </div>
          )}

          {pane.detachedAnchor !== "fullscreen" &&
            pane.detachedAnchor !== "floating" && (
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
                  event.preventDefault();
                  app.selectPane(pane.id);
                  dragStateRef.current = {
                    type: "detached",
                    mode: "resize",
                    paneId: pane.id,
                    anchor: pane.detachedAnchor,
                    startX: event.clientX,
                    startY: event.clientY,
                  };
                }}
              >
                {pane.detachedAnchor === "side" && (
                  <MaterialIcon>drag_indicator</MaterialIcon>
                )}
              </div>
            )}
        </div>
      ))}
    </div>
  );
}
