import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import {
  BiblePiece,
  BibleState,
  BibleVisualizationState,
  BookShape,
  PieceSelectionSources,
} from "bibleVizUtils.models.canvas";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { CanvasInteractions } from "bibleVizUtils.models.canvas";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { pieceDataRepository } from "bibleStack.services.index";
import type { BibleStackEvents } from "bibleStack.models.events";
import type { BookBot } from "bibleStack.models.stack";
import type { PieceRepository } from "bibleStack.services.PieceDataRepository";

const getBookRepository = (book: BookBot): PieceRepository => {
  return {
    getTypeOfPiece: () => book.tags.typeOfPiece,
    getId: () => book.id,
  };
};

export async function HandleBookClick({
  book,
  typeOfInteraction,
}: BibleStackEvents["OnBookClick"]) {
  const bookData = pieceDataRepository.getPieceData(getBookRepository(book)) as
    | StackBookData
    | StackSectionBookData
    | undefined;

  if (!bookData) {
    throw new Error("HandleBookClick: bookData not found.");
  }

  const {
    bibleData,
    sectionData,
  }: {
    bibleData: StackBibleData | undefined;
    testamentData: StackTestamentData | undefined;
    sectionData: StackSectionData | undefined;
  } = await thisBot.GetDataChainFromParentDataIds({
    parentDataIds: bookData.parentDataIds,
  });

  if (!bibleData || bibleData.currentState === BibleState.Open) {
    switch (typeOfInteraction) {
      case CanvasInteractions.Click:
        {
          if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
            BibleVizUtils.Functions.HighlightBiblePiece({ data: bookData });
          } else {
            if (!bookData?.isSelected) {
              if (thisBot.masks.isASectionMakingTourGuide) {
                if (
                  thisBot.vars.currentSectionMakingTourGuide &&
                  sectionData?.piece &&
                  sectionData.piece.id ===
                    thisBot.vars.currentSectionMakingTourGuide.id
                ) {
                  thisBot.StopCurrentTourGuide();
                }
              } else {
                if (book.masks.isHighlighted) {
                  thisBot.SelectBook({
                    book,
                    source: PieceSelectionSources.Click,
                  });
                } else {
                  thisBot.TryHighlightPiece({
                    piece: book,
                    highlightRequestSource: CanvasInteractions.Click,
                    typeOfPiece: BiblePiece.StackBook,
                  });
                }
              }
            }
          }
        }
        break;
      case CanvasInteractions.Tap:
        {
          if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
            BibleVizUtils.Functions.HighlightBiblePiece({ data: bookData });
          } else {
            if (!sectionData || sectionData.isInExplodedView) {
              if (bookData.isSelected) {
                thisBot.DeselectBook({ bookData });
              } else {
                thisBot.SelectBook({
                  book,
                  source: PieceSelectionSources.Click,
                });
              }
            } else if (
              bookData.getParentId("stackBibleId") &&
              bibleData &&
              bibleData.currentStackVizState === BibleVisualizationState.Regular
            ) {
              thisBot.TrySetSectionAsExplodedView({
                section: sectionData.piece,
              });
            }
          }
        }
        break;
      default:
        break;
    }
  }
}

export async function HandleBookDrag({ book }: BibleStackEvents["OnBookDrag"]) {
  if (thisBot.masks.isBibleAnimating) return;

  const bookData = pieceDataRepository.getPieceData(getBookRepository(book)) as
    | StackBookData
    | StackSectionBookData
    | undefined;

  if (!bookData) {
    throw new Error("HandleBookDrag: bookData not found.");
  }

  const {
    bibleData,
  }: {
    bibleData: StackBibleData | undefined;
    testamentData: StackTestamentData | undefined;
    sectionData: StackSectionData | undefined;
  } = await thisBot.GetDataChainFromParentDataIds({
    parentDataIds: bookData.parentDataIds,
  });

  if (bibleData?.currentState !== BibleState.Open || !book.tags.draggable)
    return;

  shout("OnStackPieceDrag", { piece: book, data: bookData });
}

export async function HandleBookDragging({
  book,
  draggingEvent,
}: BibleStackEvents["OnBookDragging"]) {
  if (thisBot.masks.isBibleAnimating) return;

  const bookData = pieceDataRepository.getPieceData(getBookRepository(book)) as
    | StackBookData
    | StackSectionBookData
    | undefined;

  if (!bookData) {
    throw new Error("HandleBookDragging: bookData not found.");
  }

  const {
    bibleData,
  }: {
    bibleData: StackBibleData | undefined;
    testamentData: StackTestamentData | undefined;
    sectionData: StackSectionData | undefined;
  } = await thisBot.GetDataChainFromParentDataIds({
    parentDataIds: bookData.parentDataIds,
  });

  if (bibleData?.currentState !== BibleState.Open || !book.tags.draggable)
    return;

  shout("OnStackPieceDragging", { piece: book, draggingEvent });
}

export async function HandleBookPointerEnter({
  book,
}: BibleStackEvents["OnBookPointerEnter"]) {
  if (thisBot.masks.isBibleAnimating) return;

  const bookData = pieceDataRepository.getPieceData(getBookRepository(book)) as
    | StackBookData
    | StackSectionBookData
    | undefined;

  if (!bookData) {
    throw new Error("HandleBookPointerEnter: bookData not found.");
  }

  const {
    bibleData,
    testamentData,
    sectionData,
  }: {
    bibleData: StackBibleData | undefined;
    testamentData: StackTestamentData | undefined;
    sectionData: StackSectionData | undefined;
  } = await thisBot.GetDataChainFromParentDataIds({
    parentDataIds: bookData.parentDataIds,
  });

  if (
    bibleData?.currentState !== BibleState.Open ||
    thisBot.masks.isASectionMakingTourGuide ||
    thisBot.vars.currentSectionMakingTourGuide ||
    sectionData?.piece?.id === thisBot.vars.currentSectionMakingTourGuide.id
  )
    return;

  if (bookData instanceof StackSectionBookData) {
    thisBot.TryHighlightPiece({
      piece: book,
      highlightRequestSource: CanvasInteractions.HoverBegin,
      typeOfPiece: BiblePiece.StackSectionBook,
    });
  } else {
    if (
      sectionData &&
      !sectionData.isInExplodedView &&
      bookData?.getParentId("stackTestamentId") &&
      (!bibleData ||
        bibleData.currentStackVizState === BibleVisualizationState.Regular) &&
      (bookData.currentShape === BookShape.Regular ||
        bookData.currentShape === BookShape.RegularSelected)
    ) {
      thisBot.TrySetSectionAsExplodedView({
        section: sectionData.piece,
      });
    } else if (!bookData.isSelected) {
      if (bibleData || testamentData || sectionData) {
        const booksToUnhighlight = sectionData?.childrenData
          .flat()
          .filter((currentBookData) => {
            return (
              currentBookData !== bookData &&
              currentBookData.isActive &&
              currentBookData.piece &&
              !currentBookData.piece.masks.isOnTheGround &&
              AreBothBooksInSamePlace(currentBookData, bookData)
            );
          })
          .map((currentBookData) => currentBookData.piece);
        booksToUnhighlight?.forEach((book) => {
          thisBot.TryUnhighlightPiece({
            piece: book,
            requestSource: CanvasInteractions.HoverBegin,
          });
        });
        if (testamentData) {
          const sectionsToCheck = bibleData
            ? bibleData.childrenData
                .flatMap((currentTestamentData) => {
                  return currentTestamentData.childrenData;
                })
                .filter((currentSectionData) => {
                  return (
                    !(currentSectionData instanceof StackSectionBookData) &&
                    currentSectionData != sectionData &&
                    currentSectionData.isActive &&
                    currentSectionData.isSplitIntoBooks
                  );
                })
            : testamentData.childrenData.filter((currentSectionData) => {
                return (
                  !(currentSectionData instanceof StackSectionBookData) &&
                  currentSectionData != sectionData &&
                  currentSectionData.isActive &&
                  currentSectionData.isSplitIntoBooks
                );
              });
          const unhighlightDelay = 7500;
          const booksToDecreaseHighlight = sectionsToCheck
            .map((currentSectionData) => {
              return currentSectionData.childrenData;
            })
            .flat(2)
            .filter((currentBookData) => {
              return (
                currentBookData.isActive &&
                currentBookData.getParentId("stackBibleId") &&
                currentBookData.piece &&
                currentBookData.piece.masks.isHighlighted &&
                !currentBookData.piece.masks.isHighlightDecreased
              );
            })
            .map((currentBookData) => {
              return currentBookData.piece;
            });
          booksToDecreaseHighlight.forEach((currentBook) => {
            const { unhighlightDelayInfo } = thisBot.GetUnhighlightDelayInfo({
              piece: currentBook,
            });
            thisBot.TryDecreasePieceHighlight({ piece: currentBook });
            if (!unhighlightDelayInfo) {
              thisBot.TryUnhighlightPiece({
                piece: currentBook,
                delay: unhighlightDelay,
                requestSource: CanvasInteractions.HoverBegin,
              });
            }
          });
        }
      }
      thisBot.TryHighlightPiece({
        piece: book,
        highlightRequestSource: CanvasInteractions.HoverBegin,
        typeOfPiece: BiblePiece.StackBook,
      });
    }
  }
}

export async function HandleBookPointerExit({
  book,
}: BibleStackEvents["OnBookPointerExit"]) {
  if (thisBot.masks.isBibleAnimating) return;

  const bookData = pieceDataRepository.getPieceData(getBookRepository(book)) as
    | StackBookData
    | StackSectionBookData
    | undefined;

  if (!bookData) {
    throw new Error("HandleBookPointerExit: bookData not found.");
  }

  const {
    bibleData,
    sectionData,
  }: {
    bibleData: StackBibleData | undefined;
    testamentData: StackTestamentData | undefined;
    sectionData: StackSectionData | undefined;
  } = await thisBot.GetDataChainFromParentDataIds({
    parentDataIds: bookData.parentDataIds,
  });

  if (
    bibleData?.currentState !== BibleState.Open ||
    bookData.isSelected ||
    thisBot.masks.isASectionMakingTourGuide ||
    thisBot.vars.currentSectionMakingTourGuide ||
    sectionData?.piece?.id === thisBot.vars.currentSectionMakingTourGuide.id ||
    (bookData instanceof StackBookData && bookData.getParentId("stackBibleId"))
  )
    return;

  thisBot.TryUnhighlightPiece({
    piece: book,
    delay: 2000,
    requestSource: CanvasInteractions.HoverEnd,
  });
}

export async function HandleBookPointerUp({
  book,
}: BibleStackEvents["OnBookPointerUp"]) {
  const bookData = pieceDataRepository.getPieceData(getBookRepository(book)) as
    | StackBookData
    | StackSectionBookData
    | undefined;

  if (!bookData) {
    throw new Error("HandleBookPointerUp: bookData not found.");
  }

  const {
    bibleData,
  }: {
    bibleData: StackBibleData | undefined;
    testamentData: StackTestamentData | undefined;
    sectionData: StackSectionData | undefined;
  } = await thisBot.GetDataChainFromParentDataIds({
    parentDataIds: bookData.parentDataIds,
  });

  if (bibleData?.currentState !== BibleState.Open || !book.tags.draggable)
    return;

  shout("OnStackPiecePointerUp", { piece: book });
}

export async function HandleBookDrop({
  book,
  dropEvent,
}: BibleStackEvents["OnBookDrop"]) {
  if (thisBot.masks.isBibleAnimating) return;

  const bookData = pieceDataRepository.getPieceData(getBookRepository(book)) as
    | StackBookData
    | StackSectionBookData
    | undefined;

  if (!bookData) {
    throw new Error("HandleBookDrop: bookData not found.");
  }

  const {
    bibleData,
  }: {
    bibleData: StackBibleData | undefined;
    testamentData: StackTestamentData | undefined;
    sectionData: StackSectionData | undefined;
  } = await thisBot.GetDataChainFromParentDataIds({
    parentDataIds: bookData.parentDataIds,
  });

  if (bibleData?.currentState !== BibleState.Open || !book.tags.draggable)
    return;

  shout("OnStackPieceDrop", { piece: book, dropEvent });
}

function AreBothBooksInSamePlace(
  bookData1: StackBookData | StackSectionBookData,
  bookData2: StackBookData | StackSectionBookData
) {
  return (
    (bookData1.getParentId("stackBibleId") &&
      bookData2.getParentId("stackBibleId")) ||
    (bookData1.getParentId("stackTestamentId") &&
      bookData2.getParentId("stackTestamentId")) ||
    (bookData1.getParentId("stackSectionId") &&
      bookData2.getParentId("stackSectionId"))
  );
}
