import {
  useBibleToolsManager,
  type BibleReaderToolbarTool,
} from "seed-bible.managers.BibleToolsManager";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";

interface BibleReaderToolbarProps {
  readingState: BibleReadingState;
  onOpenSelector: () => void;
}

export function BibleReaderToolbar(props: BibleReaderToolbarProps) {
  const { readingState, onOpenSelector } = props;

  const toolsManager = useBibleToolsManager();

  const tools: BibleReaderToolbarTool[] = toolsManager.getToolbarTools({
    readingState,
    onOpenSelector,
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
