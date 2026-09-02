import {
  FormatVerseRange,
  ToVerseRanges,
} from "../../../domain/functions/verseRanges";
import {
  NAV_MENU_LEVELS,
  type NavigationState,
} from "../../../domain/models/navigation";
import type { VerseRange } from "../../../domain/models/scripture";
import type { NavMenuProps } from "../../models/navigation";
import { getStyles } from "../styles/stylesProvider";
const { useState, useEffect, useMemo } = os.appHooks;

export const NavMenu = ({
  getState,
  eventBus,
  catalog,
  verseReferences,
  bookNames,
  controller,
}: NavMenuProps) => {
  const [menuState, setMenuState] = useState<NavigationState>(getState());
  const styles = useMemo(() => getStyles(), []);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe(
      "OnNavigationStateChanged",
      ({ state }) => {
        setMenuState(state);
      }
    );

    return () => unsubscribe();
  }, []);

  const groups = useMemo(
    () => catalog.getGroups(menuState.experience),
    [catalog, menuState.experience]
  );

  const [foldedGroups, setFoldedGroups] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(groups.map((group) => [group.id, group.startsFolded]))
  );

  const toggleGroup = (id: string) =>
    setFoldedGroups((folded) => ({ ...folded, [id]: !folded[id] }));

  const passages = useMemo(() => {
    const piece = menuState.selectedPiece;
    if (!piece) return { inChapter: [], elsewhere: [] };

    const reading = menuState.reading;
    const toRows = (references: typeof all) =>
      ToVerseRanges(references).map((range) => ({
        id: `${range.bookId}-${range.chapter}-${range.start}-${range.end}`,
        label: FormatVerseRange(range, bookNames.getBookName(range.bookId)),
        target: range,
      }));

    const all = verseReferences.getVersesForPiece({
      experienceKey: menuState.experience,
      pieceKey: piece,
    });

    return {
      inChapter: toRows(
        all.filter(
          (reference) =>
            reading !== null &&
            reference.bookId === reading.bookId &&
            reference.chapter === reading.chapterNumber
        )
      ),
      elsewhere: toRows(
        all.filter(
          (reference) =>
            reading === null ||
            reference.bookId !== reading.bookId ||
            reference.chapter !== reading.chapterNumber
        )
      ),
    };
  }, [
    verseReferences,
    bookNames,
    menuState.selectedPiece,
    menuState.experience,
    menuState.reading,
  ]);

  const isDetail =
    menuState.level === NAV_MENU_LEVELS.PIECE_DETAIL && menuState.selectedPiece;

  return (
    <>
      <style>{styles}</style>
      <div className="hotl-nav">
        {menuState.isOpen ? (
          <div className="hotl-panel">
            <div className="hotl-panel-head">
              {isDetail ? (
                <button
                  type="button"
                  className="hotl-icon-button"
                  aria-label="Back to the piece list"
                  onClick={() => controller.handleShowPieceList()}
                >
                  ←
                </button>
              ) : null}
              <span className="hotl-panel-title">
                {isDetail && menuState.selectedPiece
                  ? catalog.getPieceLabel(
                      menuState.experience,
                      menuState.selectedPiece
                    )
                  : menuState.experience}
              </span>
              <button
                type="button"
                className="hotl-icon-button"
                aria-label="Close the explore menu"
                onClick={() => controller.handleClose()}
              >
                ✕
              </button>
            </div>
            <div className="hotl-panel-body">
              {isDetail
                ? renderPassages(
                    passages,
                    controller.handlePassageClick.bind(controller)
                  )
                : [
                    menuState.selectedPiece ? (
                      <button
                        key="show-everything"
                        type="button"
                        className="hotl-reset"
                        onClick={() => controller.handleShowEverything()}
                      >
                        Show everything
                      </button>
                    ) : null,
                    ...groups.map((group) => {
                      const isFolded = foldedGroups[group.id] ?? false;
                      return (
                        <div key={group.id}>
                          <button
                            type="button"
                            className="hotl-group"
                            aria-expanded={!isFolded}
                            onClick={() => toggleGroup(group.id)}
                          >
                            <span aria-hidden="true">
                              {isFolded ? "▸" : "▾"}
                            </span>
                            <span>{group.label}</span>
                          </button>
                          {isFolded
                            ? null
                            : group.keys.map((key) => (
                                <button
                                  key={key}
                                  type="button"
                                  className={
                                    key === menuState.selectedPiece
                                      ? "hotl-piece hotl-piece-active"
                                      : "hotl-piece"
                                  }
                                  onClick={() =>
                                    controller.handlePieceClick(key)
                                  }
                                >
                                  {catalog.getPieceLabel(
                                    menuState.experience,
                                    key
                                  )}
                                </button>
                              ))}
                        </div>
                      );
                    }),
                  ]}
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="hotl-pill"
            onClick={() => controller.handleToggle()}
          >
            <span aria-hidden="true">▤</span>
            <span>Explore</span>
          </button>
        )}
      </div>
    </>
  );
};

interface PassageRow {
  id: string;
  label: string;
  target: VerseRange;
}

const renderPassages = (
  passages: {
    inChapter: PassageRow[];
    elsewhere: PassageRow[];
  },
  onSelect: (target: PassageRow["target"]) => void
) => {
  if (passages.inChapter.length === 0 && passages.elsewhere.length === 0) {
    return <p className="hotl-empty">No verses reference this piece yet.</p>;
  }

  return (
    <>
      {passages.inChapter.length > 0 ? (
        <>
          <div className="hotl-group-label">In this chapter</div>
          {passages.inChapter.map((row) => (
            <button
              key={row.id}
              type="button"
              className="hotl-passage"
              onClick={() => onSelect(row.target)}
            >
              {row.label}
            </button>
          ))}
        </>
      ) : null}
      {passages.elsewhere.length > 0 ? (
        <>
          <div className="hotl-group-label">
            {passages.inChapter.length > 0
              ? "Elsewhere in Scripture"
              : "In Scripture"}
          </div>
          {passages.elsewhere.map((row) => (
            <button
              key={row.id}
              type="button"
              className="hotl-passage"
              onClick={() => onSelect(row.target)}
            >
              {row.label}
            </button>
          ))}
        </>
      ) : null}
    </>
  );
};
