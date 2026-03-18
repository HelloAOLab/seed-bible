import { BibleReader } from "seed-bible.components.BibleReader";
import { BelowReaderToolbar } from "seed-bible.components.BelowReaderToolbar";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { TabsManager } from "seed-bible.managers.TabsManager";
import type { Pane } from "seed-bible.managers.PanesManager";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import {
  useBibleToolsManager,
  type BibleEmptyPaneTool,
} from "seed-bible.managers.BibleToolsManager";

const { useEffect, useRef } = os.appHooks;

function EmptyPaneToolbar({
  selectorState,
  pane,
  tabs,
}: {
  selectorState: BibleSelectorState;
  pane: Pane;
  tabs: TabsManager;
}) {
  const toolsManager = useBibleToolsManager();
  const tools: BibleEmptyPaneTool[] = toolsManager.getEmptyPaneTools({
    selectorState,
    currentPane: pane,
    tabs,
  });

  return (
    <div className="sb-empty-pane-toolbar">
      {tools.map((tool) => {
        const ToolIcon = tool.icon;
        return tool.visible ? (
          <div key={tool.id} className="sb-empty-pane-toolbar-item">
            <button
              disabled={tool.disabled}
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

  return (
    <div className="sb-panes-layout" data-layout={layout}>
      {attachedPanes.map((pane, index) => (
        <div
          key={pane.id}
          className={`sb-pane-shell sb-pane-slot-${index + 1}${
            pane.id === selectedPaneId ? " sb-pane-shell-active" : ""
          }`}
          onClick={() => app.selectPane(pane.id)}
        >
          {pane.component !== null ? (
            <div className="sb-pane-component">{pane.component}</div>
          ) : pane.tab ? (
            <div className="sb-pane-reader">
              <BibleReader
                currentPane={pane}
                readingState={pane.tab.readingState}
                selectorState={selectorState}
              />
              <BelowReaderToolbar
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
              selectorState={selectorState}
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
            {pane.component !== null ? (
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
                selectorState={selectorState}
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
