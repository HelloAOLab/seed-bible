import { BibleReader } from "seed-bible.components.BibleReader";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { ReaderTab } from "seed-bible.managers.TabsManager";

const { useEffect, useRef } = os.appHooks;

interface PaneLayoutProps {
  tabs: ReaderTab[];
  paneTabIds: string[];
  paneSizes: number[];
  selectedTabId: string;
  selectorState: BibleSelectorState;
  onResizePane: (
    index: number,
    deltaRatio: number,
    baseSizes: number[]
  ) => void;
}

export function PaneLayout(props: PaneLayoutProps) {
  const {
    tabs,
    paneTabIds,
    paneSizes,
    selectedTabId,
    selectorState,
    onResizePane,
  } = props;
  const panesContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    index: number;
    startPointer: number;
    startSizes: number[];
  } | null>(null);

  const paneTabs = paneTabIds
    .map((tabId) => tabs.find((tab) => tab.id === tabId) ?? null)
    .filter((tab) => tab !== null);

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
      {paneTabs.map((tab, index) => [
        <div
          key={tab.id}
          className={`sb-pane-shell${
            tab.id === selectedTabId ? " sb-pane-shell-active" : ""
          }`}
          style={{ flex: `${paneSizes[index] ?? 1} 1 0%` }}
        >
          <div className="sb-pane-reader">
            <BibleReader
              readingState={tab.readingState}
              selectorState={selectorState}
            />
          </div>
        </div>,
        index < paneTabs.length - 1 ? (
          <div
            key={`${tab.id}-splitter`}
            className="sb-pane-divider"
            onPointerDown={(event: PointerEvent) => {
              const isStackedLayout = window.innerWidth <= 768;
              dragStateRef.current = {
                index,
                startPointer: isStackedLayout ? event.clientY : event.clientX,
                startSizes: [...paneSizes],
              };
            }}
          />
        ) : null,
      ])}
    </div>
  );
}
