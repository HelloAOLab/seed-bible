import "./BelowReaderToolbar.css";
import { type ToolsManager } from "../../managers/BibleToolsManager";
import type { BibleReadingState } from "../../managers/BibleReadingManager";
import type { BibleSelectorState } from "../../managers/BibleSelectorManager";
import type { TabsManager } from "../../managers/TabsManager";
import type { Pane, PanesManager } from "../../managers/PanesManager";
import { useI18n } from "../../i18n/I18nManager";
import type { BibleReadingSession } from "../../managers/SessionsManager";
import { translateTitle } from "../../components/Utils";
import { handleVerticalListKeyNav } from "../../components/KeyboardNav";
import type { ChatsManager } from "../../managers/ChatsManager";
import { useState } from "preact/hooks";

interface BelowReaderToolbarProps {
  toolsManager: ToolsManager;
  readingState: BibleReadingState;
  sharedSession: BibleReadingSession | null;
  selectorState: BibleSelectorState;
  tabsManager: TabsManager;
  panesManager: PanesManager;
  currentPane: Pane;
  chats: ChatsManager;
  openSidebar: () => void;
  openSearch: () => void;
  toast: (message: string) => void;
  openChat: () => void;
}

export function BelowReaderToolbar(props: BelowReaderToolbarProps) {
  const {
    toolsManager,
    readingState,
    sharedSession,
    selectorState,
    tabsManager,
    panesManager,
    openSidebar,
    openSearch,
    currentPane,
    toast,
    openChat,
    chats,
  } = props;
  const tools = toolsManager.getBelowReaderTools({
    readingState,
    sharedSession,
    selectorState,
    tabs: tabsManager,
    panesManager,
    openSidebar,
    currentPane,
    openSearch,
    toast,
    openChat,
    chats,
  });

  if (tools.length === 0) {
    return null;
  }

  const { t } = useI18n();
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);

  return (
    <div className="sb-below-reader-toolbar">
      {tools.map((tool) => {
        const title = translateTitle(t, tool.title);
        const ToolIcon = tool.icon;
        const menuItems =
          tool.getItems?.().filter((item) => item.visible.value) ?? [];
        const hasMenuItems = menuItems.length > 0;
        return tool.visible.value ? (
          <div key={tool.id} className="sb-below-reader-toolbar-item">
            <button
              disabled={tool.disabled.value}
              onClick={() => {
                if (hasMenuItems) {
                  setSelectedToolId((prev) =>
                    prev === tool.id ? null : tool.id
                  );
                  return;
                }

                setSelectedToolId(null);
                tool.onSelect();
              }}
              className="sb-below-reader-toolbar-button"
              aria-label={title}
              title={title}
            >
              <ToolIcon />
              <span className="sr-only">{title}</span>
            </button>
            {hasMenuItems && selectedToolId === tool.id && (
              <div
                className="sb-tool-context-menu"
                role="menu"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setSelectedToolId(null);
                    return;
                  }
                  handleVerticalListKeyNav(event, event.currentTarget);
                }}
              >
                {menuItems.map((item) => {
                  const MenuItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      disabled={item.disabled.value}
                      onClick={() => {
                        item.onSelect();
                        setSelectedToolId(null);
                      }}
                      className="sb-tool-context-menu-item"
                      role="menuitem"
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
