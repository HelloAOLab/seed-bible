import { SeedBibleIcon, MaterialIcon } from "seed-bible.components.icons";

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

  return (
    <div className="sb-reader-toolbar">
      <div className="sb-reader-toolbar-item">
        <button
          disabled={!canGoToPreviousChapter || disabled}
          onClick={onGoToPreviousChapter}
          className="sb-reader-toolbar-button"
        >
          <MaterialIcon>chevron_left</MaterialIcon>
          <span className="sr-only">Previous Chapter</span>
        </button>
      </div>
      <div className="sb-reader-toolbar-item">
        <button
          onClick={onOpenSelector}
          disabled={disabled}
          className="sb-reader-toolbar-button"
        >
          <SeedBibleIcon />
          <span className="sr-only">Open Book Selector</span>
        </button>
      </div>
      <div className="sb-reader-toolbar-item">
        <button
          disabled={!canGoToNextChapter || disabled}
          onClick={onGoToNextChapter}
          className="sb-reader-toolbar-button"
        >
          <MaterialIcon>chevron_right</MaterialIcon>
          <span className="sr-only">Next Chapter</span>
        </button>
      </div>
    </div>
  );
}
