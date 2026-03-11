import {
  bibleToolsManager,
  type BibleReaderToolbarTool,
} from "seed-bible.managers.BibleToolsManager";

interface BibleReaderToolbarProps {
  canGoToPreviousChapter: boolean;
  canGoToNextChapter: boolean;
  disabled: boolean;
  onGoToPreviousChapter: () => void;
  onOpenSelector: () => void;
  onGoToNextChapter: () => void;
}

export function BibleReaderToolbar(props: BibleReaderToolbarProps) {
  const {
    canGoToPreviousChapter,
    canGoToNextChapter,
    disabled,
    onGoToPreviousChapter,
    onOpenSelector,
    onGoToNextChapter,
  } = props;

  const tools: BibleReaderToolbarTool[] = bibleToolsManager.getToolbarTools({
    canGoToPreviousChapter,
    canGoToNextChapter,
    disabled,
    onGoToPreviousChapter,
    onOpenSelector,
    onGoToNextChapter,
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
