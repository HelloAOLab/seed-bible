import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import {
  BiblePiece,
  BibleState,
  BibleVisualizationState,
  BookShape,
  PieceSelectionSources,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { CanvasInteractions } from "bibleVizUtils.models.canvas";
import type { DraggingEvent, DropEvent } from "bibleVizUtils.models.casualos";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";

/**
 * Called whenever a book is interacted
 * It is in charge of managing whether to highlight, select, drag or drop the book when possible
 * @param {Object} that - Object that contains important data for the function
 * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found at globalThis.CanvasInteractions
 * @param {Object} that.draggingEvent? - Is optional and is the information received when the type of interaction is a drag
 * @param {Object} that.dropEvent? - Is optional and is the information received when the type of interaction is a drop
 * @example
 * thisBot.HandleBookInteraction({book: someBook, typeOfInteraction: CanvasInteractions.Drag, dragEvent: someDragInfo});
 */

const {
  book,
  typeOfInteraction,
  draggingEvent,
  dropEvent,
}: {
  book: Bot;
  typeOfInteraction: CanvasInteraction;
  dropEvent?: DropEvent;
  draggingEvent?: DraggingEvent;
} = that;
if (
  thisBot.masks.isBibleAnimating &&
  typeOfInteraction !== CanvasInteractions.Click &&
  typeOfInteraction !== CanvasInteractions.Tap &&
  typeOfInteraction !== CanvasInteractions.PointerUp
)
  return;

const bookData = await (thisBot.GetPieceData({ piece: book }) as Promise<
  StackBookData | StackSectionBookData | undefined
>);

if (!bookData) {
  throw new Error("HandleBookInteraction: bookData not found.");
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
            thisBot.TrySetSectionAsExplodedView({ section: sectionData.piece });
          }
        }
      }
      break;
    case CanvasInteractions.HoverBegin:
      {
        if (
          !(
            thisBot.masks.isASectionMakingTourGuide &&
            thisBot.vars.currentSectionMakingTourGuide &&
            sectionData?.piece &&
            sectionData.piece.id ===
              thisBot.vars.currentSectionMakingTourGuide.id
          )
        ) {
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
                bibleData.currentStackVizState ===
                  BibleVisualizationState.Regular) &&
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
                            !(
                              currentSectionData instanceof StackSectionBookData
                            ) &&
                            currentSectionData != sectionData &&
                            currentSectionData.isActive &&
                            currentSectionData.isSplitIntoBooks
                          );
                        })
                    : testamentData.childrenData.filter(
                        (currentSectionData) => {
                          return (
                            !(
                              currentSectionData instanceof StackSectionBookData
                            ) &&
                            currentSectionData != sectionData &&
                            currentSectionData.isActive &&
                            currentSectionData.isSplitIntoBooks
                          );
                        }
                      );
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
                    const { unhighlightDelayInfo } =
                      thisBot.GetUnhighlightDelayInfo({ piece: currentBook });
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
      }
      break;
    case CanvasInteractions.HoverEnd:
      {
        if (
          !bookData.isSelected &&
          !(
            thisBot.masks.isASectionMakingTourGuide &&
            thisBot.vars.currentSectionMakingTourGuide &&
            sectionData?.piece &&
            sectionData.piece.id ===
              thisBot.vars.currentSectionMakingTourGuide.id
          )
        ) {
          if (
            bookData instanceof StackSectionBookData ||
            !bookData.getParentId("stackBibleId")
          ) {
            thisBot.TryUnhighlightPiece({
              piece: book,
              delay: 2000,
              requestSource: CanvasInteractions.HoverEnd,
            });
          }
        }
      }
      break;
    // case CanvasInteractions.SearchBarSelection:
    // {
    //     if(!sectionData.isSectionBook && !sectionData.isInExplodedView && bookData.parentDataIds.stackBibleId && stackData.currentStackVizState === BibleVisualizationState.Regular)
    //     {
    //         return thisBot.TrySetSectionAsExplodedView({section: sectionData.section}).then(() => {return thisBot.SelectBook({book})})
    //     }
    //     else
    //     {
    //         return thisBot.SelectBook({book})
    //     }
    // }
    case CanvasInteractions.Drag:
      {
        if (book.tags.draggable)
          shout("OnStackPieceDrag", { piece: book, data: bookData });
      }
      break;
    case CanvasInteractions.Dragging:
      {
        if (book.tags.draggable)
          shout("OnStackPieceDragging", { piece: book, draggingEvent });
      }
      break;
    case CanvasInteractions.Drop:
      {
        if (book.tags.draggable)
          shout("OnStackPieceDrop", { piece: book, dropEvent });
      }
      break;
    case CanvasInteractions.PointerUp:
      {
        if (book.tags.draggable)
          shout("OnStackPiecePointerUp", { piece: book });
      }
      break;
    default:
      break;
  }
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
