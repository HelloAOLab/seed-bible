import {
  useBibleToolsManager,
  type BibleReaderToolbarTool,
} from "seed-bible.managers.BibleToolsManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { PanesManager } from "seed-bible.managers.PanesManager";
import type { ReaderTab, TabsManager } from "seed-bible.managers.TabsManager";
import { useSignal } from "@preact/signals";

const { useEffect } = os.appHooks;

interface BibleReaderToolbarProps {
  tabs: ReaderTab[];
  selectedTabId: string;
  selectorState: BibleSelectorState;
  tabsManager: TabsManager;
  panesManager: PanesManager;
  onOpenSidebar: () => void;
}

export function BibleReaderToolbar(props: BibleReaderToolbarProps) {
  const {
    tabs,
    selectedTabId,
    selectorState,
    tabsManager,
    panesManager,
    onOpenSidebar: openSidebar,
  } = props;
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
    tabs: tabsManager,
    panesManager,
    openSidebar,
  });

  const verseToolbarTools: BibleReaderToolbarTool[] =
    toolsManager.getVerseToolbarTools({
      readingState,
      selectorState,
      tabs: tabsManager,
      panesManager,
      openSidebar,
    });

  const hasVerseSelection = readingState.selectedVerses.value.length > 0;
  const isSmallScreen = viewportWidth.value <= 480;
  const shouldReplaceDefaultToolbar = isSmallScreen && hasVerseSelection;
  const isMoreMenuOpen = useSignal(false);

  const previousChapterTool =
    tools.find((tool) => tool.id === "previous-chapter") ?? null;
  const nextChapterTool =
    tools.find((tool) => tool.id === "next-chapter") ?? null;
  const openSelectorTool =
    tools.find((tool) => tool.id === "open-selector") ?? null;
  const openSidebarTool =
    tools.find((tool) => tool.id === "open-sidebar") ?? null;
  const overflowTools = tools.filter(
    (tool) =>
      tool.visible &&
      tool.id !== "previous-chapter" &&
      tool.id !== "next-chapter" &&
      tool.id !== "open-selector" &&
      tool.id !== "open-sidebar"
  );
  const hasOverflowTools = overflowTools.length > 0;

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
        <div className="sb-reader-toolbar-wrap">
          {isSmallScreen && previousChapterTool && (
            <button
              disabled={previousChapterTool.disabled}
              onClick={previousChapterTool.onSelect}
              className="sb-reader-toolbar-floating-button sb-reader-toolbar-floating-button-left"
              aria-label={previousChapterTool.title}
            >
              <previousChapterTool.icon />
            </button>
          )}

          {isSmallScreen && nextChapterTool && (
            <button
              disabled={nextChapterTool.disabled}
              onClick={nextChapterTool.onSelect}
              className="sb-reader-toolbar-floating-button sb-reader-toolbar-floating-button-right"
              aria-label={nextChapterTool.title}
            >
              <nextChapterTool.icon />
            </button>
          )}

          <div
            className={`sb-reader-toolbar${isSmallScreen ? " sb-reader-toolbar-mobile-layout" : ""}`}
          >
            {isSmallScreen ? (
              <>
                <div className="sb-reader-toolbar-item">
                  <button
                    disabled={!openSidebarTool || openSidebarTool.disabled}
                    onClick={() => {
                      openSidebarTool?.onSelect();
                    }}
                    className="sb-reader-toolbar-button"
                    aria-label={openSidebarTool?.title ?? "Open sidebar"}
                  >
                    {openSidebarTool ? (
                      <openSidebarTool.icon />
                    ) : (
                      <span className="material-symbols-outlined">menu</span>
                    )}
                  </button>
                </div>

                <div className="sb-reader-toolbar-item sb-reader-toolbar-center-item">
                  <button
                    disabled={!openSelectorTool || openSelectorTool.disabled}
                    onClick={() => {
                      openSelectorTool?.onSelect();
                    }}
                    className="sb-reader-toolbar-button"
                    aria-label={openSelectorTool?.title ?? "Open Book Selector"}
                  >
                    {openSelectorTool ? <openSelectorTool.icon /> : null}
                  </button>
                </div>

                <div className="sb-reader-toolbar-item sb-reader-toolbar-more-anchor">
                  {hasOverflowTools && (
                    <>
                      <button
                        onClick={() => {
                          isMoreMenuOpen.value = !isMoreMenuOpen.value;
                        }}
                        className="sb-reader-toolbar-button"
                        aria-label="More tools"
                      >
                        <span>more</span>
                      </button>
                      {isMoreMenuOpen.value && (
                        <div className="sb-reader-toolbar-more-menu">
                          {overflowTools.map((tool) => {
                            const ToolIcon = tool.icon;
                            return tool.visible ? (
                              <button
                                key={tool.id}
                                disabled={tool.disabled}
                                onClick={() => {
                                  tool.onSelect();
                                  isMoreMenuOpen.value = false;
                                }}
                                className="sb-reader-toolbar-more-item"
                              >
                                <ToolIcon />
                                <span>{tool.title}</span>
                              </button>
                            ) : null;
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              tools.map((tool) => {
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
              })
            )}
          </div>
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
