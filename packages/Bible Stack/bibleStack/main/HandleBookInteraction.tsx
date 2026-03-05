/**
 * Called whenever a book is interacted
 * It is in charge of managing whether to highlight, select, drag or drop the book when possible
 * @param {Object} that - Object that contains important data for the function
 * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found at globalThis.BibleVizUtils.Data.tags.InteractionType
 * @param {Object} that.dragInfo? - Is optional and is the information received when the type of interaction is a drag
 * @param {Object} that.dropInfo? - Is optional and is the information received when the type of interaction is a drop
 * @example
 * thisBot.HandleBookInteraction({book: someBook, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Drag, dragInfo: someDragInfo});
 */

const { book, typeOfInteraction, dragInfo, dropInfo } = that;
if (
  thisBot.masks.isBibleAnimating &&
  typeOfInteraction !== BibleVizUtils.Data.tags.InteractionType.Click &&
  typeOfInteraction !== BibleVizUtils.Data.tags.InteractionType.Tap &&
  typeOfInteraction !== BibleVizUtils.Data.tags.InteractionType.PointerUp
)
  return;
const bookData = thisBot.GetPieceData({ piece: book });
const { bibleData, testamentData, sectionData } =
  thisBot.GetDataChainFromParentDataIds({
    parentDataIds: bookData.parentDataIds,
  });

if (
  !bibleData ||
  bibleData.currentState === BibleVizUtils.Data.tags.BibleState.Open
) {
  switch (typeOfInteraction) {
    case BibleVizUtils.Data.tags.InteractionType.Click:
      {
        if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
          BibleVizUtils.Functions.HighlightBiblePiece({ data: bookData });
        } else {
          if (!bookData?.isSelected) {
            if (thisBot.masks.isASectionMakingTourGuide) {
              if (
                thisBot.vars.currentSectionMakingTourGuide &&
                sectionData?.piece.id ===
                  thisBot.vars.currentSectionMakingTourGuide.id
              ) {
                thisBot.StopCurrentTourGuide();
              }
            } else {
              if (book.masks.isHighlighted) {
                thisBot.SelectBook({
                  book,
                  source:
                    BibleVizUtils.Data.tags.PieceDataSelectionSource.Click,
                });
              } else {
                thisBot.TryHighlightPiece({
                  piece: book,
                  highlightRequestSource:
                    BibleVizUtils.Data.tags.InteractionType.Click,
                  typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackBook,
                });
              }
            }
          }
        }
      }
      break;
    case BibleVizUtils.Data.tags.InteractionType.Tap:
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
                source: BibleVizUtils.Data.tags.PieceDataSelectionSource.Click,
              });
            }
          } else if (
            bookData.parentDataIds.stackBibleId &&
            bibleData.currentStackVizState ===
              BibleVizUtils.Data.tags.BibleVisualizationState.Regular
          ) {
            thisBot.TrySetSectionAsExplodedView({ section: sectionData.piece });
          }
        }
      }
      break;
    case BibleVizUtils.Data.tags.InteractionType.HoverBegin:
      {
        if (
          !(
            thisBot.masks.isASectionMakingTourGuide &&
            thisBot.vars.currentSectionMakingTourGuide &&
            sectionData?.piece.id ===
              thisBot.vars.currentSectionMakingTourGuide.id
          )
        ) {
          if (bookData instanceof StackSectionBookData) {
            thisBot.TryHighlightPiece({
              piece: book,
              highlightRequestSource:
                BibleVizUtils.Data.tags.InteractionType.HoverBegin,
              typeOfPiece:
                BibleVizUtils.Data.tags.BiblePieceType.StackSectionBook,
            });
          } else {
            if (
              sectionData &&
              !sectionData.isInExplodedView &&
              bookData?.parentDataIds.stackTestamentId &&
              (!bibleData ||
                bibleData.currentStackVizState ===
                  BibleVizUtils.Data.tags.BibleVisualizationState.Regular) &&
              (bookData.currentShape ===
                BibleVizUtils.Data.tags.BookShapeType.Regular ||
                bookData.currentShape ===
                  BibleVizUtils.Data.tags.BookShapeType.RegularSelected)
            ) {
              thisBot.TrySetSectionAsExplodedView({
                section: sectionData.piece,
              });
            } else if (!bookData.isSelected) {
              if (bibleData || testamentData || sectionData) {
                const booksToUnhighlight = sectionData.childrenData
                  .flat()
                  .filter((currentBookData: any) => {
                    return (
                      currentBookData !== bookData &&
                      currentBookData.isActive &&
                      !currentBookData.piece.masks.isOnTheGround &&
                      AreBothBooksInSamePlace(currentBookData, bookData)
                    );
                  })
                  .map((currentBookData: any) => currentBookData.piece);
                booksToUnhighlight.forEach((book: any) => {
                  thisBot.TryUnhighlightPiece({
                    piece: book,
                    requestSource:
                      BibleVizUtils.Data.tags.InteractionType.HoverBegin,
                  });
                });
                if (testamentData) {
                  const sectionsToCheck = bibleData
                    ? bibleData.childrenData
                        .flatMap((currentTestamentData: any) => {
                          return currentTestamentData.childrenData;
                        })
                        .filter((currentSectionData: any) => {
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
                        (currentSectionData: any) => {
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
                    .map((currentSectionData: any) => {
                      return currentSectionData.childrenData;
                    })
                    .flat(2)
                    .filter((currentBookData: any) => {
                      return (
                        currentBookData.isActive &&
                        currentBookData.parentDataIds.stackBibleId &&
                        currentBookData.piece.masks.isHighlighted &&
                        !currentBookData.piece.masks.isHighlightDecreased
                      );
                    })
                    .map((currentBookData: any) => {
                      return currentBookData.piece;
                    });
                  booksToDecreaseHighlight.forEach((currentBook: any) => {
                    const { unhighlightDelayInfo } =
                      thisBot.GetUnhighlightDelayInfo({ piece: currentBook });
                    thisBot.TryDecreasePieceHighlight({ piece: currentBook });
                    if (!unhighlightDelayInfo) {
                      thisBot.TryUnhighlightPiece({
                        piece: currentBook,
                        delay: unhighlightDelay,
                        requestSource:
                          BibleVizUtils.Data.tags.InteractionType.HoverBegin,
                      });
                    }
                  });
                }
              }
              thisBot.TryHighlightPiece({
                piece: book,
                highlightRequestSource:
                  BibleVizUtils.Data.tags.InteractionType.HoverBegin,
                typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackBook,
              });
            }
          }
        }
      }
      break;
    case BibleVizUtils.Data.tags.InteractionType.HoverEnd:
      {
        if (
          !bookData.isSelected &&
          !(
            thisBot.masks.isASectionMakingTourGuide &&
            thisBot.vars.currentSectionMakingTourGuide &&
            sectionData?.piece.id ===
              thisBot.vars.currentSectionMakingTourGuide.id
          )
        ) {
          if (
            bookData instanceof StackSectionBookData ||
            !bookData.parentDataIds.stackBibleId
          ) {
            thisBot.TryUnhighlightPiece({
              piece: book,
              delay: 2000,
              requestSource: BibleVizUtils.Data.tags.InteractionType.HoverEnd,
            });
          }
        }
      }
      break;
    // case BibleVizUtils.Data.tags.InteractionType.SearchBarSelection:
    // {
    //     if(!sectionData.isSectionBook && !sectionData.isInExplodedView && bookData.parentDataIds.stackBibleId && stackData.currentStackVizState === BibleVizUtils.Data.tags.BibleVisualizationState.Regular)
    //     {
    //         return thisBot.TrySetSectionAsExplodedView({section: sectionData.section}).then(() => {return thisBot.SelectBook({book})})
    //     }
    //     else
    //     {
    //         return thisBot.SelectBook({book})
    //     }
    // }
    case BibleVizUtils.Data.tags.InteractionType.Drag:
      {
        if (book.tags.draggable)
          shout("OnStackPieceDrag", { piece: book, data: bookData });
      }
      break;
    case BibleVizUtils.Data.tags.InteractionType.Dragging:
      {
        if (book.tags.draggable)
          shout("OnStackPieceDragging", { piece: book, dragInfo });
      }
      break;
    case BibleVizUtils.Data.tags.InteractionType.Drop:
      {
        if (book.tags.draggable)
          shout("OnStackPieceDrop", { piece: book, dropInfo });
      }
      break;
    case BibleVizUtils.Data.tags.InteractionType.PointerUp:
      {
        if (book.tags.draggable)
          shout("OnStackPiecePointerUp", { piece: book });
      }
      break;
    default:
      break;
  }
}

function AreBothBooksInSamePlace(bookData1: any, bookData2: any) {
  return (
    (bookData1.parentDataIds.stackBibleId &&
      bookData2.parentDataIds.stackBibleId) ||
    (bookData1.parentDataIds.stackTestamentId &&
      bookData2.parentDataIds.stackTestamentId) ||
    (bookData1.parentDataIds.stackSectionId &&
      bookData2.parentDataIds.stackSectionId)
  );
}
