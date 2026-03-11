import {
  useBibleToolsManager,
  type BibleReaderToolbarTool,
} from "seed-bible.managers.BibleToolsManager";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";

export interface SelectedVerse {
  bookId: string;
  chapterNumber: number;
  verseNumber: number;
  verseText: string;
  translationId: string | null;
}

interface BibleReaderToolbarProps {
  readingState: BibleReadingState;
  selectorState: BibleSelectorState;
  selectedVerse?: SelectedVerse | null;
  onClearSelection?: () => void;
}

export function BibleReaderToolbar(props: BibleReaderToolbarProps) {
  const { readingState, selectorState, selectedVerse, onClearSelection } =
    props;

  const toolsManager = useBibleToolsManager();

  const tools: BibleReaderToolbarTool[] = toolsManager.getToolbarTools({
    readingState,
    selectorState,
    selectedVerse: selectedVerse ?? null,
    clearSelection: onClearSelection,
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
