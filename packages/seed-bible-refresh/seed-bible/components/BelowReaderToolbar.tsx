import {
  useBibleToolsManager,
  type BibleBelowReaderToolbarTool,
} from "seed-bible.managers.BibleToolsManager";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";

interface BelowReaderToolbarProps {
  readingState: BibleReadingState;
}

export function BelowReaderToolbar(props: BelowReaderToolbarProps) {
  const { readingState } = props;
  const toolsManager = useBibleToolsManager();
  const tools: BibleBelowReaderToolbarTool[] = toolsManager.getBelowReaderTools(
    {
      readingState,
    }
  );

  if (tools.length === 0) {
    return null;
  }

  return (
    <div className="sb-below-reader-toolbar">
      {tools.map((tool) => {
        const ToolIcon = tool.icon;
        return tool.visible ? (
          <div key={tool.id} className="sb-below-reader-toolbar-item">
            <button
              disabled={tool.disabled}
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
