import {
  useBibleToolsManager,
  type BibleReaderToolbarTool,
} from "seed-bible.managers.BibleToolsManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { ReaderTab } from "seed-bible.managers.TabsManager";
import { useSignal } from "@preact/signals";

const { useEffect } = os.appHooks;

interface BibleReaderToolbarProps {
  tabs: ReaderTab[];
  selectedTabId: string;
  selectorState: BibleSelectorState;
}

export function BibleReaderToolbar(props: BibleReaderToolbarProps) {
  const { tabs, selectedTabId, selectorState } = props;
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? null;
  const readingState = selectedTab?.readingState ?? null;

  if (!readingState) {
    return null;
  }

  const toolsManager = useBibleToolsManager();
  const viewportWidth = useSignal(
    typeof window === "undefined" ? 0 : window.innerWidth
  );

  useEffect(() => {
    const onResize = () => {
      viewportWidth.value = window.innerWidth;
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const tools: BibleReaderToolbarTool[] = toolsManager.getToolbarTools({
    readingState,
    selectorState,
  });

  const verseToolbarTools: BibleReaderToolbarTool[] =
    toolsManager.getVerseToolbarTools({
      readingState,
      selectorState,
    });

  const hasVerseSelection = readingState.selectedVerses.value.length > 0;
  const isSmallScreen = viewportWidth.value <= 480;
  const shouldReplaceDefaultToolbar = isSmallScreen && hasVerseSelection;

  const floatingAnchor = readingState.selectedVerses.value.reduce<{
    x: number;
    y: number;
    selectedAt: number;
  } | null>((latest, verse) => {
    if (
      typeof verse.selectionX !== "number" ||
      typeof verse.selectionY !== "number"
    ) {
      return latest;
    }

    const selectedAt = verse.selectedAt ?? 0;
    if (!latest || selectedAt >= latest.selectedAt) {
      return {
        x: verse.selectionX,
        y: verse.selectionY,
        selectedAt,
      };
    }

    return latest;
  }, null);
  const floatingX = Math.min(
    Math.max(floatingAnchor?.x ?? viewportWidth.value / 2, 84),
    Math.max(84, viewportWidth.value - 84)
  );
  const floatingY = Math.max((floatingAnchor?.y ?? 0) - 64, 64);

  return (
    <>
      {!shouldReplaceDefaultToolbar && (
        <div className="sb-reader-toolbar">
          {tools.map((tool) => {
            const ToolIcon = tool.icon;
            return tool.visible ? (
              <div key={tool.id} className="sb-reader-toolbar-item">
                <button
                  disabled={tool.disabled}
                  onClick={tool.onSelect}
                  className="sb-reader-toolbar-button"
                >
                  <ToolIcon />
                  <span className="sr-only">{tool.title}</span>
                </button>
              </div>
            ) : null;
          })}
        </div>
      )}

      {hasVerseSelection && verseToolbarTools.length > 0 && (
        <div
          className={`sb-verse-toolbar${isSmallScreen ? " sb-verse-toolbar-mobile" : ""}`}
          style={
            isSmallScreen
              ? undefined
              : {
                  left: `${floatingX}px`,
                  top: `${floatingY}px`,
                }
          }
        >
          <div className="sb-verse-toolbar-tools">
            {verseToolbarTools.map((tool) => {
              const ToolIcon = tool.icon;
              return tool.visible ? (
                <div key={tool.id} className="sb-reader-toolbar-item">
                  <button
                    disabled={tool.disabled}
                    onClick={tool.onSelect}
                    className="sb-reader-toolbar-button"
                  >
                    <ToolIcon />
                    <span className="sr-only">{tool.title}</span>
                  </button>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </>
  );
}
