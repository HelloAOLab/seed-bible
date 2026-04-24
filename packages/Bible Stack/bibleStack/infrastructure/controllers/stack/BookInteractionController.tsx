import type { BookBot } from "bibleStack.models.stack";
import { CanvasInteractions } from "bibleVizUtils.infrastructure.models.canvas";
import type { BookInteractionServicePort } from "bibleStack.application.ports.books";
import { PieceMapper } from "bibleVizUtils.infrastructure.mappers.PieceMapper";

export class BookInteractionController {
  #bookInteractionServicePort: BookInteractionServicePort;

  constructor(bookInteractionServicePort: BookInteractionServicePort) {
    this.#bookInteractionServicePort = bookInteractionServicePort;
  }

  handleBookClick({
    book,
    interaction,
  }: {
    book: BookBot;
    interaction:
      | (typeof CanvasInteractions)["Tap"]
      | (typeof CanvasInteractions)["Click"];
  }) {
    const piece = PieceMapper.toDomain(book);
    this.#bookInteractionServicePort.handleBookClick({
      book: piece,
      interaction: interaction === "Click" ? "Precise" : "Coarse",
    });
  }

  handleBookDrag({ book }: { book: BookBot }) {
    const piece = PieceMapper.toDomain(book);
    this.#bookInteractionServicePort.handleBookDrag({
      book: piece,
    });
  }
}

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
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { pieceDataRepository } from "bibleStack.services.index";
import type { BibleStackEvents } from "bibleStack.models.events";
import type { PieceRepository } from "bibleStack.services.PieceDataRepository";

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
