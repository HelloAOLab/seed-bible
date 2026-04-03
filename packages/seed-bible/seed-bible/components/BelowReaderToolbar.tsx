import {
  type ToolsManager,
  type ToolTitle,
} from "seed-bible.managers.BibleToolsManager";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { TabsManager } from "seed-bible.managers.TabsManager";
import type { Pane, PanesManager } from "seed-bible.managers.PanesManager";
import { useI18n } from "seed-bible.i18n.I18nManager";

interface BelowReaderToolbarProps {
  toolsManager: ToolsManager;
  readingState: BibleReadingState;
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
    selectorState,
    tabsManager,
    panesManager,
    openSidebar,
    currentPane,
  } = props;
  const tools = toolsManager.getBelowReaderTools({
    readingState,
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

  const translateTitle = (title: ToolTitle): string => {
    if (typeof title === "string") {
      return title;
    }
    return t(title.key, { defaultValue: title.defaultValue });
  };

  return (
    <div className="sb-below-reader-toolbar">
      {tools.map((tool) => {
        const title = translateTitle(tool.title);
        const ToolIcon = tool.icon;
        return tool.visible.value ? (
          <div key={tool.id} className="sb-below-reader-toolbar-item">
            <button
              disabled={tool.disabled.value}
              onClick={tool.onSelect}
              className="sb-below-reader-toolbar-button"
              aria-label={title}
              title={title}
            >
              <ToolIcon />
              <span className="sr-only">{title}</span>
            </button>
          </div>
        ) : null;
      })}
    </div>
  );
}
