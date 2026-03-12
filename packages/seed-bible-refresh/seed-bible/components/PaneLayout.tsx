import { BibleReader } from "seed-bible.components.BibleReader";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { Pane, PaneLayoutId } from "seed-bible.managers.PanesManager";

const { useEffect, useRef } = os.appHooks;

interface PaneLayoutProps {
  panes: Pane[];
  layout: PaneLayoutId;
  selectedPaneId: string | null;
  selectorState: BibleSelectorState;
  onSelectPane: (paneId: string) => void;
  onMovePane: (paneId: string, deltaX: number, deltaY: number) => void;
  onResizePane: (
    paneId: string,
    deltaWidth: number,
    deltaHeight: number
  ) => void;
}

export function PaneLayout(props: PaneLayoutProps) {
  const {
    panes,
    layout,
    selectedPaneId,
    selectorState,
    onSelectPane,
    onMovePane,
    onResizePane,
  } = props;
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
        onMovePane(dragState.paneId, deltaX, deltaY);
      } else {
        onResizePane(dragState.paneId, deltaX, deltaY);
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
  }, [onMovePane, onResizePane]);

  return (
    <div className="sb-panes-layout" data-layout={layout}>
      {attachedPanes.map((pane, index) => (
        <div
          key={pane.id}
          className={`sb-pane-shell sb-pane-slot-${index + 1}${
            pane.id === selectedPaneId ? " sb-pane-shell-active" : ""
          }`}
          onClick={() => onSelectPane(pane.id)}
        >
          {pane.component !== null ? (
            <div className="sb-pane-component">{pane.component}</div>
          ) : pane.tab ? (
            <div className="sb-pane-reader">
              <BibleReader
                readingState={pane.tab.readingState}
                selectorState={selectorState}
              />
            </div>
          ) : (
            <div className="sb-pane-empty">(empty)</div>
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
          onPointerDown={() => onSelectPane(pane.id)}
        >
          <div
            className="sb-pane-detached-header"
            onPointerDown={(event: PointerEvent) => {
              event.stopPropagation();
              onSelectPane(pane.id);
              dragStateRef.current = {
                mode: "move",
                paneId: pane.id,
                startX: event.clientX,
                startY: event.clientY,
              };
            }}
          >
            <span className="sb-pane-detached-title">Detached Pane</span>
          </div>

          <div className="sb-pane-detached-body">
            {pane.component !== null ? (
              <div className="sb-pane-component">{pane.component}</div>
            ) : pane.tab ? (
              <div className="sb-pane-reader">
                <BibleReader
                  readingState={pane.tab.readingState}
                  selectorState={selectorState}
                />
              </div>
            ) : (
              <div className="sb-pane-empty">(empty)</div>
            )}
          </div>

          <div
            className="sb-pane-detached-resize-handle"
            onPointerDown={(event: PointerEvent) => {
              event.stopPropagation();
              onSelectPane(pane.id);
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
