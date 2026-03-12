import { BibleReader } from "seed-bible.components.BibleReader";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { Pane } from "seed-bible.managers.PanesManager";

const { useEffect, useRef } = os.appHooks;

interface PaneLayoutProps {
  panes: Pane[];
  selectedPaneId: string | null;
  selectorState: BibleSelectorState;
  onSelectPane: (paneId: string) => void;
  onResizePane: (
    index: number,
    deltaRatio: number,
    baseSizes: number[]
  ) => void;
}

export function PaneLayout(props: PaneLayoutProps) {
  const { panes, selectedPaneId, selectorState, onSelectPane, onResizePane } =
    props;
  const panesContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    index: number;
    startPointer: number;
    startSizes: number[];
  } | null>(null);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      const container = panesContainerRef.current;
      if (!dragState || !container) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const isStackedLayout = window.innerWidth <= 768;
      const containerSize = isStackedLayout
        ? containerRect.height
        : containerRect.width;

      if (containerSize <= 0) {
        return;
      }

      const pointerDelta = isStackedLayout
        ? event.clientY - dragState.startPointer
        : event.clientX - dragState.startPointer;
      onResizePane(
        dragState.index,
        pointerDelta / containerSize,
        dragState.startSizes
      );
    };

    const onPointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onResizePane]);

  return (
    <div ref={panesContainerRef} className="sb-panes-layout">
      {panes.map((pane, index) => [
        <div
          key={pane.id}
          className={`sb-pane-shell${
            pane.id === selectedPaneId ? " sb-pane-shell-active" : ""
          }`}
          style={{ flex: `${pane.size} 1 0%` }}
          onClick={() => onSelectPane(pane.id)}
        >
          <div className="sb-pane-reader">
            <BibleReader
              readingState={pane.tab.readingState}
              selectorState={selectorState}
            />
          </div>
        </div>,
        index < panes.length - 1 ? (
          <div
            key={`${pane.id}-splitter`}
            className="sb-pane-divider"
            onPointerDown={(event: PointerEvent) => {
              const isStackedLayout = window.innerWidth <= 768;
              dragStateRef.current = {
                index,
                startPointer: isStackedLayout ? event.clientY : event.clientX,
                startSizes: panes.map((entry) => entry.size),
              };
            }}
          />
        ) : null,
      ])}
    </div>
  );
}
