import "./QuickToolbar.inline.css";
import "./QuickToolbar.css";
import {
  CURRENT_PLAYLIST_TOOL_ID,
  type ToolsManager,
} from "../../managers/BibleToolsManager";
import { IconButton } from "../IconButton/IconButton";
import type { BibleReadingState } from "../../managers/BibleReadingManager";
import { useI18n } from "../../i18n/I18nManager";
import { translateTitle } from "../../app/utils";
import { handleHorizontalListKeyNav } from "../../app/keyboardNav";
import { useState } from "preact/hooks";
import type { PlaylistManager } from "../../managers/PlaylistManager";
import type { FeaturesManager } from "../../managers/FeaturesManager";
import type { AnnotationsManager } from "../../managers/AnnotationsManager";
import type { BibleReadingSession } from "../../managers/SessionsManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { AppState } from "../../managers/SeedBibleStateManager";
import type { EmbedThemeChoice } from "../../managers/EmbedMode";
import type { SettingsManager } from "../../managers";
import type { ReadingPlansManager } from "../../managers/ReadingPlansManager";

interface QuickToolbarProps {
  toolsManager: ToolsManager;
  readingState: BibleReadingState;
  playlists: PlaylistManager;
  annotations: AnnotationsManager;
  features: FeaturesManager;
  settings: SettingsManager;
  /** Extra class for layout differences (e.g. desktop vs mobile header). */
  className?: string;
  /** Shared session for the current reader surface, if any. Used by Share. */
  sharedSession?: BibleReadingSession | null;
  toast?: (message: string) => void;
  modals?: ModalManager;
  app?: AppState;
  /** Theme presets the share sheet's Embed picker offers besides System. */
  embedThemes?: { readonly value: readonly EmbedThemeChoice[] };
  /** Active customization locator, kept on the embed URL. */
  customizationLocator?: { readonly value: string | null };
  readingPlans: ReadingPlansManager;
  /** Limits the toolbar to the tools this returns true for. */
  toolFilter?: (toolId: string) => boolean;
}

/**
 * Compact toolbar shown at the top of the reader, beside the chapter
 * save and bookmark buttons. Renders whatever tools extensions have registered via
 * `toolsManager.registerQuickTool`, mirroring the other reader toolbars
 * (icon buttons, optional getItems() context menus). Renders nothing when
 * no quick tool is currently visible.
 */
export function QuickToolbar(props: QuickToolbarProps) {
  const { toolsManager, readingState, playlists, readingPlans, settings } =
    props;
  const { t } = useI18n();
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);

  const tools = toolsManager.getQuickTools({
    readingState,
    playlists,
    annotations: props.annotations,
    features: props.features,
    surface: "quick-toolbar",
    sharedSession: props.sharedSession ?? null,
    toast: props.toast,
    modals: props.modals,
    app: props.app,
    embedThemes: props.embedThemes,
    customizationLocator: props.customizationLocator,
    settings,
    readingPlans,
  });
  const visibleTools = tools.filter(
    (tool) => (props.toolFilter?.(tool.id) ?? true) && tool.visible.value
  );

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
        const onSelect = () => {
          if (hasMenuItems) {
            setSelectedToolId((prev) => (prev === tool.id ? null : tool.id));
            return;
          }

          setSelectedToolId(null);
          tool.onSelect();
        };
        return (
          <div
            key={tool.id}
            className={`sb-quick-toolbar-item${tool.className ? ` ${tool.className}` : ""}`}
          >
            {/* "Now playing" is a small card with the playlist's title, not
                an icon, so it keeps a plain button sized to fit it. */}
            {tool.id === CURRENT_PLAYLIST_TOOL_ID ? (
              <button
                type="button"
                disabled={tool.disabled.value}
                onClick={onSelect}
                className="sb-quick-toolbar-now-playing"
                aria-label={title}
                title={title}
              >
                <ToolIcon />
                <span className="sr-only">{title}</span>
              </button>
            ) : (
              <IconButton
                icon={<ToolIcon />}
                label={title}
                pressed={hasMenuItems ? selectedToolId === tool.id : undefined}
                disabled={tool.disabled.value}
                onClick={onSelect}
                className="sb-quick-toolbar-button"
              />
            )}
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
