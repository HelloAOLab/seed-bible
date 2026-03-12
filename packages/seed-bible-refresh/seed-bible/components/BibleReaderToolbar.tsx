import {
  useBibleToolsManager,
  type BibleReaderToolbarTool,
} from "seed-bible.managers.BibleToolsManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { ReaderTab } from "seed-bible.managers.TabsManager";

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

  const tools: BibleReaderToolbarTool[] = toolsManager.getToolbarTools({
    readingState,
    selectorState,
  });

  return (
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
  );
}
