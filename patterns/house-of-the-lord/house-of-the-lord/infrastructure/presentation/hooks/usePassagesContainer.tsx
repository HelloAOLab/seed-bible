import {
  FormatVerseRange,
  ToVerseRanges,
} from "../../../domain/functions/verseRanges";
import type {
  NavMenuPassages,
  PassagesGroupData,
  UsePassagesContainerType,
} from "../components/containers/PassagesContainer";
import { useNavMenuContext } from "../context/NavMenu/NavMenuContext";

const { useMemo } = os.appHooks;

type UsePassagesContainer = () => UsePassagesContainerType;

const EMPTY_TEXT = "No verses reference this piece yet.";
const IN_CHAPTER_TITLE = "In this chapter";
const ELSEWHERE_TITLE = "Elsewhere in Scripture";
const IN_SCRIPTURE_TITLE = "In Scripture";

export const usePassagesContainer: UsePassagesContainer = () => {
  const { menuState, verseReferences, bookNames } = useNavMenuContext();

  const passages = useMemo<NavMenuPassages>(() => {
    const piece = menuState.selectedPiece;
    if (!piece) return { inChapter: [], elsewhere: [] };

    const reading = menuState.reading;
    const all = verseReferences.getVersesForPiece({
      experienceKey: menuState.experience,
      pieceKey: piece,
    });

    const toRows = (references: typeof all) =>
      ToVerseRanges(references).map((range) => ({
        id: `${range.bookId}-${range.chapter}-${range.start}-${range.end}`,
        label: FormatVerseRange(range, bookNames.getBookName(range.bookId)),
        target: range,
      }));

    const isCurrentChapter = (reference: (typeof all)[number]) =>
      reading !== null &&
      reference.bookId === reading.bookId &&
      reference.chapter === reading.chapterNumber;

    return {
      inChapter: toRows(all.filter(isCurrentChapter)),
      elsewhere: toRows(
        all.filter((reference) => !isCurrentChapter(reference))
      ),
    };
  }, [
    verseReferences,
    bookNames,
    menuState.selectedPiece,
    menuState.experience,
    menuState.reading,
  ]);

  const isEmpty =
    passages.inChapter.length === 0 && passages.elsewhere.length === 0;

  const passagesGroups = useMemo<PassagesGroupData[]>(
    () => [
      {
        key: "in-chapter",
        title: IN_CHAPTER_TITLE,
        passages: passages.inChapter,
      },
      {
        key: "elsewhere",
        title:
          passages.inChapter.length > 0 ? ELSEWHERE_TITLE : IN_SCRIPTURE_TITLE,
        passages: passages.elsewhere,
      },
    ],
    [passages]
  );

  return {
    isEmpty,
    emptyText: EMPTY_TEXT,
    passagesGroups,
  };
};
