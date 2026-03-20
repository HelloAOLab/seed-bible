import {
  type ToolsManager,
  type BibleBelowReaderToolbarTool,
} from "seed-bible.managers.BibleToolsManager";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { TabsManager } from "seed-bible.managers.TabsManager";
import type { Pane, PanesManager } from "seed-bible.managers.PanesManager";

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
  const tools: BibleBelowReaderToolbarTool[] = toolsManager.getBelowReaderTools(
    {
      readingState,
      selectorState,
      tabs: tabsManager,
      panesManager,
      openSidebar,
      currentPane,
    }
  );

  if (tools.length === 0) {
    return null;
  }

  return (
    <div className="sb-below-reader-toolbar">
      {tools.map((tool) => {
        const ToolIcon = tool.icon;
        return tool.visible.value ? (
          <div key={tool.id} className="sb-below-reader-toolbar-item">
            <button
              disabled={tool.disabled.value}
              onClick={tool.onSelect}
              className="sb-below-reader-toolbar-button"
              aria-label={tool.title}
              title={tool.title}
            >
              <ToolIcon />
              <span className="sr-only">{tool.title}</span>
            </button>
          </div>
        ) : null;
      })}
    </div>
  );
}
