import { type ToolsManager } from "../managers/BibleToolsManager";
import type { BibleReadingState } from "../managers/BibleReadingManager";
import { useI18n } from "../i18n/I18nManager";
import { translateTitle } from "../components/Utils";
import { handleHorizontalListKeyNav } from "../components/KeyboardNav";
import { useState } from "preact/hooks";
import type { PlaylistManager } from "../managers/PlaylistManager";

interface QuickToolbarProps {
  toolsManager: ToolsManager;
  readingState: BibleReadingState;
  playlists: PlaylistManager;
  /** Extra class for layout differences (e.g. desktop vs mobile header). */
  className?: string;
}

/**
 * Compact toolbar shown at the top of the reader, beside the chapter
 * bookmark button. Renders whatever tools extensions have registered via
 * `toolsManager.registerQuickTool`, mirroring the other reader toolbars
 * (icon buttons, optional getItems() context menus). Renders nothing when
 * no quick tool is currently visible.
 */
export function QuickToolbar(props: QuickToolbarProps) {
  const { toolsManager, readingState, playlists } = props;
  const { t } = useI18n();
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);

  const tools = toolsManager.getQuickTools({ readingState, playlists });
  const visibleTools = tools.filter((tool) => tool.visible.value);

  if (visibleTools.length === 0) {
    return null;
  }

  return (
    <div
      className={`sb-quick-toolbar${props.className ? ` ${props.className}` : ""}`}
    >
      {visibleTools.map((tool) => {
        const title = translateTitle(t, tool.title);
        const ToolIcon = tool.icon;
        const menuItems =
          tool.getItems?.().filter((item) => item.visible.value) ?? [];
        const hasMenuItems = menuItems.length > 0;
        return (
          <div
            key={tool.id}
            className={`sb-quick-toolbar-item${tool.className ? ` ${tool.className}` : ""}`}
          >
            <button
              type="button"
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
              className="sb-quick-toolbar-button"
              aria-label={title}
              aria-pressed={
                hasMenuItems ? selectedToolId === tool.id : undefined
              }
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
                  handleHorizontalListKeyNav(event, event.currentTarget);
                }}
              >
                {menuItems.map((item) => {
                  const MenuItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
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
        );
      })}
    </div>
  );
}
