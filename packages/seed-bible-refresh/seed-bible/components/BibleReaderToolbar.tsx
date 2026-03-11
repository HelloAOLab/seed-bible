import {
  useBibleToolsManager,
  type BibleReaderToolbarTool,
} from "seed-bible.managers.BibleToolsManager";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";

interface BibleReaderToolbarProps {
  readingState: BibleReadingState;
  selectorState: BibleSelectorState;
}

export function BibleReaderToolbar(props: BibleReaderToolbarProps) {
  const { readingState, selectorState } = props;

  const toolsManager = useBibleToolsManager();

  const tools: BibleReaderToolbarTool[] = toolsManager.getToolbarTools({
    readingState,
    selectorState,
  });

  return (
    <div className="sb-reader-toolbar">
      {tools.map((tool) => {
        const ToolIcon = tool.icon;
        return (
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
        );
      })}
    </div>
  );
}
