import {
  type ToolsManager,
  type ToolTitle,
} from "seed-bible.managers.BibleToolsManager";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { TabsManager } from "seed-bible.managers.TabsManager";
import type { Pane, PanesManager } from "seed-bible.managers.PanesManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import type { BibleReadingSession } from "seed-bible.managers.SessionsManager";

const { useState } = os.appHooks;

interface BelowReaderToolbarProps {
  toolsManager: ToolsManager;
  readingState: BibleReadingState;
  sharedSession: BibleReadingSession | null;
  selectorState: BibleSelectorState;
  tabsManager: TabsManager;
  panesManager: PanesManager;
  currentPane: Pane;
  openSidebar: () => void;
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
    currentPane,
  } = props;
  const tools = toolsManager.getBelowReaderTools({
    readingState,
    sharedSession,
    selectorState,
    tabs: tabsManager,
    panesManager,
    openSidebar,
    currentPane,
  });

  if (tools.length === 0) {
    return null;
  }

  const { t } = useI18n();
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);

  const translateTitle = (title: ToolTitle): string => {
    if (typeof title === "string") {
      return title;
    }
    return t(title.key, { defaultValue: title.defaultValue, ns: title.ns });
  };

  return (
    <div className="sb-below-reader-toolbar">
      {tools.map((tool) => {
        const title = translateTitle(tool.title);
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
              <div className="sb-tool-context-menu">
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
  );
}
