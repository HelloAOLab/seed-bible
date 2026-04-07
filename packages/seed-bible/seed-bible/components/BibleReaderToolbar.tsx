import { batch, useComputed, useSignal } from "@preact/signals";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import type { ToolTitle } from "seed-bible.managers.BibleToolsManager";

const { useEffect } = os.appHooks;

interface BibleReaderToolbarProps {
  state: SeedBibleState;
}

export function BibleReaderToolbar(props: BibleReaderToolbarProps) {
  const { tabs, selector, panes, sidebar, tools: toolsManager } = props.state;
  const selectedTab = useComputed(
    () =>
      tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null
  );
  const readingState = useComputed(
    () => selectedTab.value?.readingState ?? null
  );
  const sessionState = useComputed(
    () => selectedTab.value?.sharedSession ?? null
  );

  if (!readingState.value) {
    return null;
  }

  const viewportWidth = useSignal(
    typeof window === "undefined" ? 0 : window.innerWidth
  );
  const viewportHeight = useSignal(
    typeof window === "undefined" ? 0 : window.innerHeight
  );

  useEffect(() => {
    const onResize = () => {
      batch(() => {
        viewportWidth.value = window.innerWidth;
        viewportHeight.value = window.innerHeight;
      });
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const tools = useComputed(() =>
    toolsManager.getToolbarTools({
      readingState: readingState.value!,
      sharedSession: sessionState.value,
      selectorState: selector,
      tabs: tabs,
      panesManager: panes,
      window: {
        innerWidth: viewportWidth,
        innerHeight: viewportHeight,
      },
      openSidebar: sidebar.openSidebar,
    })
  );

  const verseToolbarTools = useComputed(() =>
    toolsManager.getVerseToolbarTools({
      readingState: readingState.value!,
      sharedSession: sessionState.value,
      selectorState: selector,
      tabs: tabs,
      panesManager: panes,
      window: {
        innerWidth: viewportWidth,
        innerHeight: viewportHeight,
      },
      openSidebar: sidebar.openSidebar,
    })
  );

  const hasVerseSelection = useComputed(
    () => readingState.value!.selectedVerses.value.length > 0
  );
  const isSmallScreen = useComputed(() => viewportWidth.value <= 480);
  const shouldReplaceDefaultToolbar = useComputed(
    () => isSmallScreen.value && hasVerseSelection.value
  );
  const isMoreMenuOpen = useSignal(false);
  const selectedToolbarToolId = useSignal<string | null>(null);
  const selectedVerseToolId = useSignal<string | null>(null);
  const selectedOverflowToolId = useSignal<string | null>(null);

  const previousChapterTool = useComputed(
    () => tools.value.find((tool) => tool.id === "previous-chapter") ?? null
  );
  const nextChapterTool = useComputed(
    () => tools.value.find((tool) => tool.id === "next-chapter") ?? null
  );
  const openSelectorTool = useComputed(
    () => tools.value.find((tool) => tool.id === "open-selector") ?? null
  );
  const openSidebarTool = useComputed(
    () => tools.value.find((tool) => tool.id === "open-sidebar") ?? null
  );
  const overflowTools = useComputed(() =>
    tools.value.filter(
      (tool) =>
        tool.visible.value &&
        tool.id !== "previous-chapter" &&
        tool.id !== "next-chapter" &&
        tool.id !== "open-selector" &&
        tool.id !== "open-sidebar"
    )
  );
  const hasOverflowTools = useComputed(() => overflowTools.value.length > 0);

  const floatingAnchor = useComputed(() =>
    readingState.value!.selectedVerses.value.reduce<{
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
    }, null)
  );
  const floatingX = useComputed(() =>
    Math.min(
      Math.max(floatingAnchor.value?.x ?? viewportWidth.value / 2, 84),
      Math.max(84, viewportWidth.value - 84)
    )
  );
  const floatingY = useComputed(() =>
    Math.max((floatingAnchor.value?.y ?? 0) - 64, 64)
  );

  const { t } = useI18n();
  const translateTitle = (title: ToolTitle): string => {
    if (typeof title === "string") {
      return title;
    }
    return t(title.key, { defaultValue: title.defaultValue });
  };

  return (
    <>
      {!shouldReplaceDefaultToolbar.value && (
        <div
          className="sb-reader-toolbar-wrap"
          dir={readingState.value?.translation.value?.textDirection ?? "auto"}
        >
          {isSmallScreen.value && previousChapterTool.value && (
            <button
              disabled={previousChapterTool.value.disabled.value}
              onClick={previousChapterTool.value.onSelect}
              className="sb-reader-toolbar-floating-button sb-reader-toolbar-floating-button-left"
              aria-label={translateTitle(previousChapterTool.value.title)}
            >
              <previousChapterTool.value.icon />
            </button>
          )}

          {isSmallScreen.value && nextChapterTool.value && (
            <button
              disabled={nextChapterTool.value.disabled.value}
              onClick={nextChapterTool.value.onSelect}
              className="sb-reader-toolbar-floating-button sb-reader-toolbar-floating-button-right"
              aria-label={translateTitle(nextChapterTool.value.title)}
            >
              <nextChapterTool.value.icon />
            </button>
          )}

          <div
            className={`sb-reader-toolbar${isSmallScreen.value ? " sb-reader-toolbar-mobile-layout" : ""}`}
          >
            {isSmallScreen.value ? (
              <>
                <div className="sb-reader-toolbar-item">
                  <button
                    disabled={
                      !openSidebarTool.value ||
                      openSidebarTool.value.disabled.value
                    }
                    onClick={() => {
                      selectedToolbarToolId.value = null;
                      openSidebarTool.value?.onSelect();
                    }}
                    className="sb-reader-toolbar-button"
                    aria-label={translateTitle(
                      openSidebarTool.value?.title ?? {
                        key: "open_sidebar",
                        defaultValue: "Open sidebar",
                      }
                    )}
                  >
                    {openSidebarTool.value ? (
                      <openSidebarTool.value.icon />
                    ) : (
                      <span className="material-symbols-outlined">menu</span>
                    )}
                  </button>
                </div>

                <div className="sb-reader-toolbar-item sb-reader-toolbar-center-item">
                  <button
                    disabled={
                      !openSelectorTool.value ||
                      openSelectorTool.value.disabled.value
                    }
                    onClick={() => {
                      selectedToolbarToolId.value = null;
                      openSelectorTool.value?.onSelect();
                    }}
                    className="sb-reader-toolbar-button"
                    aria-label={translateTitle(
                      openSelectorTool.value?.title ?? {
                        key: "open_book_selector",
                        defaultValue: "Open Book Selector",
                      }
                    )}
                  >
                    {openSelectorTool.value ? (
                      <openSelectorTool.value.icon />
                    ) : null}
                  </button>
                </div>

                <div className="sb-reader-toolbar-item sb-reader-toolbar-more-anchor">
                  {hasOverflowTools.value && (
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
                          {overflowTools.value.map((tool) => {
                            const ToolIcon = tool.icon;
                            return tool.visible.value ? (
                              <div key={tool.id}>
                                <button
                                  disabled={tool.disabled.value}
                                  onClick={() => {
                                    const menuItems = tool.getItems?.() ?? [];
                                    if (menuItems.length > 0) {
                                      selectedOverflowToolId.value =
                                        selectedOverflowToolId.value === tool.id
                                          ? null
                                          : tool.id;
                                      return;
                                    }

                                    selectedOverflowToolId.value = null;
                                    tool.onSelect();
                                    isMoreMenuOpen.value = false;
                                  }}
                                  className="sb-reader-toolbar-more-item"
                                >
                                  <ToolIcon />
                                  <span>{translateTitle(tool.title)}</span>
                                </button>
                                {selectedOverflowToolId.value === tool.id &&
                                  (() => {
                                    const menuItems =
                                      tool
                                        .getItems?.()
                                        .filter((item) => item.visible.value) ??
                                      [];
                                    if (menuItems.length === 0) {
                                      return null;
                                    }

                                    return (
                                      <div className="sb-tool-context-menu sb-tool-context-menu-inline">
                                        {menuItems.map((item) => {
                                          const MenuItemIcon = item.icon;
                                          return (
                                            <button
                                              key={item.id}
                                              disabled={item.disabled.value}
                                              onClick={() => {
                                                item.onSelect();
                                                selectedOverflowToolId.value =
                                                  null;
                                                isMoreMenuOpen.value = false;
                                              }}
                                              className="sb-tool-context-menu-item"
                                            >
                                              <MenuItemIcon />
                                              <span>
                                                {translateTitle(item.title)}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              tools.value.map((tool) => {
                const ToolIcon = tool.icon;
                const menuItems =
                  tool.getItems?.().filter((item) => item.visible.value) ?? [];
                const hasMenuItems = menuItems.length > 0;
                return tool.visible.value ? (
                  <div key={tool.id} className="sb-reader-toolbar-item">
                    <button
                      disabled={tool.disabled.value}
                      onClick={() => {
                        if (hasMenuItems) {
                          selectedToolbarToolId.value =
                            selectedToolbarToolId.value === tool.id
                              ? null
                              : tool.id;
                          return;
                        }

                        selectedToolbarToolId.value = null;
                        tool.onSelect();
                      }}
                      className="sb-reader-toolbar-button"
                    >
                      <ToolIcon />
                      <span className="sr-only">
                        {translateTitle(tool.title)}
                      </span>
                    </button>
                    {hasMenuItems &&
                      selectedToolbarToolId.value === tool.id && (
                        <div className="sb-tool-context-menu">
                          {menuItems.map((item) => {
                            const MenuItemIcon = item.icon;
                            return (
                              <button
                                key={item.id}
                                disabled={item.disabled.value}
                                onClick={() => {
                                  item.onSelect();
                                  selectedToolbarToolId.value = null;
                                }}
                                className="sb-tool-context-menu-item"
                              >
                                <MenuItemIcon />
                                <span>{translateTitle(item.title)}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                  </div>
                ) : null;
              })
            )}
          </div>
        </div>
      )}

      {hasVerseSelection.value && verseToolbarTools.value.length > 0 && (
        <div
          className={`sb-verse-toolbar${isSmallScreen.value ? " sb-verse-toolbar-mobile" : ""}`}
          style={
            isSmallScreen.value
              ? undefined
              : {
                  left: `${floatingX}px`,
                  top: `${floatingY}px`,
                }
          }
        >
          <div className="sb-verse-toolbar-tools">
            {verseToolbarTools.value.map((tool) => {
              const ToolIcon = tool.icon;
              const menuItems =
                tool.getItems?.().filter((item) => item.visible.value) ?? [];
              const hasMenuItems = menuItems.length > 0;
              return tool.visible.value ? (
                <div key={tool.id} className="sb-reader-toolbar-item">
                  <button
                    disabled={tool.disabled.value}
                    onClick={() => {
                      if (hasMenuItems) {
                        selectedVerseToolId.value =
                          selectedVerseToolId.value === tool.id
                            ? null
                            : tool.id;
                        return;
                      }

                      selectedVerseToolId.value = null;
                      tool.onSelect();
                    }}
                    className="sb-reader-toolbar-button"
                  >
                    <ToolIcon />
                    <span className="sr-only">
                      {translateTitle(tool.title)}
                    </span>
                  </button>
                  {hasMenuItems && selectedVerseToolId.value === tool.id && (
                    <div className="sb-tool-context-menu">
                      {menuItems.map((item) => {
                        const MenuItemIcon = item.icon;
                        return (
                          <button
                            key={item.id}
                            disabled={item.disabled.value}
                            onClick={() => {
                              item.onSelect();
                              selectedVerseToolId.value = null;
                            }}
                            className="sb-tool-context-menu-item"
                          >
                            <MenuItemIcon />
                            <span>{translateTitle(item.title)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </>
  );
}
