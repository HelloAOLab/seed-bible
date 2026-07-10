import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import type {
  BookDataRepositoryPort,
  BookInteractionServicePort,
  BookSelectionServicePort,
  PieceAdapterPort,
  SequenceStateServicePort,
} from "../ports/books";
import {
  BibleStates,
  BibleVisualizationStates,
  BookShapes,
  PieceSelectionSources,
  SelectionModalities,
  type Piece,
  type SelectionModality,
} from "../../domain/models/canvas";
import type {
  PieceHierarchyServicePort,
  StackParentDataIds,
} from "../ports/pieces";
import type { TourGuideServicePort } from "../ports/tourGuide";
import {
  HighlightRequestSources,
  HighlightPacings,
  UnhighlightRequestSources,
} from "../../domain/models/pieces";
import type { ExplodedViewServicePort } from "../ports/explodedView";
import type { StackBookData } from "../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import type { StackSectionData } from "../../domain/entities/StackSectionData";
import { LabelTranslucencyModes } from "../../domain/models/label";
import type { BookInteractionConfigProviderPort } from "../../infrastructure/ports/bookInteraction";
import { BookInteractionDelays } from "../../infrastructure/config/bookInteraction/delays";

interface ServiceParams {
  bookDataRepositoryPort: BookDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  tourGuideServicePort: TourGuideServicePort;
  bookSelectionServicePort: BookSelectionServicePort;
  pieceHighlightServicePort: PieceHighlighterPort;
  explodedViewServicePort: ExplodedViewServicePort;
  sequenceStateServicePort: SequenceStateServicePort;
  pieceAdapterPort: PieceAdapterPort;
  bookInteractionConfigProviderPort: BookInteractionConfigProviderPort;
}

export class BookInteractionService implements BookInteractionServicePort {
  #bookDataRepositoryPort: ServiceParams["bookDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #tourGuideServicePort: ServiceParams["tourGuideServicePort"];
  #bookSelectionServicePort: ServiceParams["bookSelectionServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];
  #explodedViewServicePort: ServiceParams["explodedViewServicePort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  // #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #bookInteractionConfigProviderPort: ServiceParams["bookInteractionConfigProviderPort"];

  constructor({
    bookDataRepositoryPort,
    pieceHierarchyServicePort,
    tourGuideServicePort,
    bookSelectionServicePort,
    pieceHighlightServicePort,
    explodedViewServicePort,
    sequenceStateServicePort,
    // pieceAdapterPort,
    bookInteractionConfigProviderPort,
  }: ServiceParams) {
    this.#bookDataRepositoryPort = bookDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#tourGuideServicePort = tourGuideServicePort;
    this.#bookSelectionServicePort = bookSelectionServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#explodedViewServicePort = explodedViewServicePort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    // this.#pieceAdapterPort = pieceAdapterPort;
    this.#bookInteractionConfigProviderPort = bookInteractionConfigProviderPort;
  }

  handleBookSelection({
    book,
    interaction,
  }: {
    book: Piece<"StackBook" | "StackSectionBook">;
    interaction: SelectionModality;
  }): void {
    const bookData = this.#bookDataRepositoryPort.getPieceData(book);

    if (!bookData) {
      throw new Error(
        "BookInteractionService: bookData not found at handleBookClick."
      );
    }

    const { bibleData, sectionData } =
      this.#pieceHierarchyServicePort.getParentDataChain(
        bookData.parentDataIds as StackParentDataIds
      );

    if (bibleData?.currentState !== BibleStates.Open) {
      return;
    }

    if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
      // TODO: Refactor the logic to highlight pieces to match the Clean Architecture. Use "painted", "marked", "colored"?
      BibleVizUtils.Functions.HighlightBiblePiece({ data: bookData });
    } else {
      switch (interaction) {
        case SelectionModalities.Precise:
          {
            if (bookData.selectionState !== "Selected") {
              if (this.#tourGuideServicePort.isThereAnOngoingTourGuide()) {
                if (
                  sectionData?.piece &&
                  this.#tourGuideServicePort.ongoingTourGuideSectionData?.id ===
                    sectionData.id
                ) {
                  this.#tourGuideServicePort.stopTourGuide();
                }
              } else {
                if (bookData.highlightState === "Highlighted") {
                  this.#sequenceStateServicePort.executeAsSequence(() =>
                    this.#bookSelectionServicePort.selectBook({
                      data: bookData,
                      source: PieceSelectionSources.UserSelection,
                    })
                  );
                } else {
                  this.#pieceHighlightServicePort.tryHighlightPiece({
                    piece: book,
                    source: HighlightRequestSources.UserSelection,
                  });
                }
              }
            }
          }
          break;
        case SelectionModalities.Coarse:
          {
            if (!sectionData || sectionData.isInExplodedView) {
              if (
                bookData.selectionState === "Selected" ||
                bookData.selectionState === "Selecting"
              ) {
                this.#sequenceStateServicePort.executeAsSequence(() =>
                  this.#bookSelectionServicePort.deselectBook(bookData)
                );
              } else {
                this.#sequenceStateServicePort.executeAsSequence(() =>
                  this.#bookSelectionServicePort.selectBook({
                    data: bookData,
                    source: PieceSelectionSources.StackUserPresenceUpdate,
                  })
                );
              }
            } else if (
              bookData.getParentId("stackBibleId") &&
              bibleData &&
              bibleData.currentStackVizState ===
                BibleVisualizationStates.Regular
            ) {
              this.#sequenceStateServicePort.executeAsSequence(() =>
                this.#explodedViewServicePort.explodeSection({
                  data: sectionData,
                })
              );
            }
          }
          break;
        default:
          break;
      }
    }
  }

  handleBookFocusBegin(book: Piece<"StackBook"> | Piece<"StackSectionBook">) {
    const bookData = this.#bookDataRepositoryPort.getPieceData(book);

    if (!bookData) {
      throw new Error(
        "BookInteractionService: bookData not found at handleBookFocusBegin."
      );
    }

    bookData.beginFocus();

    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const { bibleData, testamentData, sectionData } =
      this.#pieceHierarchyServicePort.getParentDataChain(
        bookData.parentDataIds as StackParentDataIds
      );

    if (
      bibleData?.currentState !== BibleStates.Open ||
      (this.#tourGuideServicePort.isThereAnOngoingTourGuide() &&
        this.#tourGuideServicePort.ongoingTourGuideSectionData?.id ===
          sectionData?.id)
    )
      return;

    switch (bookData.type) {
      case "StackSectionBook":
        {
          this.#pieceHighlightServicePort.tryHighlightPiece({
            piece: book,
            source: HighlightRequestSources.UserFocus,
          });
        }
        break;
      case "StackBook":
        {
          if (
            sectionData &&
            !sectionData.isInExplodedView &&
            bookData?.getParentId("stackTestamentId") &&
            (!bibleData ||
              bibleData.currentStackVizState ===
                BibleVisualizationStates.Regular) &&
            (bookData.currentShape === BookShapes.Regular ||
              bookData.currentShape === BookShapes.RegularSelected)
          ) {
            this.#sequenceStateServicePort.executeAsSequence(() =>
              this.#explodedViewServicePort.explodeSection({
                data: sectionData,
              })
            );
          } else if (bookData.selectionState !== "Selected") {
            if (bibleData || testamentData || sectionData) {
              const booksToUnhighlight = sectionData?.childrenData
                .flat()
                .filter((currentBookData) => {
                  return (
                    currentBookData !== bookData &&
                    currentBookData.isActive &&
                    currentBookData.piece &&
                    !currentBookData.isOnTheGround &&
                    AreBothBooksInSamePlace(currentBookData, bookData)
                  );
                })
                .map((currentBookData) => currentBookData.piece);
              if (
                Array.isArray(booksToUnhighlight) &&
                booksToUnhighlight?.length > 0
              ) {
                for (const bookToUnhighlight of booksToUnhighlight) {
                  if (bookToUnhighlight) {
                    this.#pieceHighlightServicePort.tryUnhighlightPiece({
                      piece: bookToUnhighlight,
                      source: HighlightRequestSources.UserFocus,
                      pacing: HighlightPacings.Regular,
                    });
                  }
                }
              }
              if (testamentData) {
                const sectionsToCheck = bibleData
                  ? (bibleData.childrenData
                      .flatMap((currentTestamentData) => {
                        return currentTestamentData.childrenData;
                      })
                      .filter((currentSectionData) => {
                        return (
                          currentSectionData.type !== "StackSectionBook" &&
                          currentSectionData != sectionData &&
                          currentSectionData.isActive &&
                          currentSectionData.isSplitIntoBooks
                        );
                      }) as StackSectionData[])
                  : (testamentData.childrenData.filter((currentSectionData) => {
                      return (
                        currentSectionData.type !== "StackSectionBook" &&
                        currentSectionData != sectionData &&
                        currentSectionData.isActive &&
                        currentSectionData.isSplitIntoBooks
                      );
                    }) as StackSectionData[]);
                const unhighlightDelay =
                  this.#bookInteractionConfigProviderPort.getDelay(
                    BookInteractionDelays.UnhighlightOtherSectionBooks
                  );
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
                      currentBookData.highlightState === "Highlighted" &&
                      currentBookData.labelTranslucency ===
                        LabelTranslucencyModes.Solid
                    );
                  })
                  .map((currentBookData) => {
                    return currentBookData.piece;
                  });
                for (const bookToDecreateHighlight of booksToDecreaseHighlight) {
                  if (bookToDecreateHighlight) {
                    this.#pieceHighlightServicePort.changeHighlightIntensity({
                      piece: bookToDecreateHighlight,
                      intensity: LabelTranslucencyModes.Faded,
                    });
                    if (
                      !this.#pieceHighlightServicePort.isUnhighlightScheduled(
                        bookToDecreateHighlight
                      )
                    ) {
                      this.#pieceHighlightServicePort.tryUnhighlightPiece({
                        piece: bookToDecreateHighlight,
                        source: HighlightRequestSources.UserFocus,
                        pacing: HighlightPacings.Regular,
                        delay: unhighlightDelay,
                      });
                    }
                  }
                }
              }
            }
            this.#pieceHighlightServicePort.tryHighlightPiece({
              piece: book,
              source: HighlightRequestSources.UserFocus,
            });
          }
        }
        break;
    }
  }

  handleBookFocusEnd(book: Piece<"StackBook" | "StackSectionBook">): void {
    const bookData = this.#bookDataRepositoryPort.getPieceData(book);

    if (!bookData) {
      throw new Error(
        "BookInteractionService: bookData not found at handleBookFocusEnd."
      );
    }

    bookData.endFocus();

    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const { bibleData, sectionData } =
      this.#pieceHierarchyServicePort.getParentDataChain(
        bookData.parentDataIds as StackParentDataIds
      );

    if (
      bibleData?.currentState !== BibleStates.Open ||
      bookData.selectionState === "Selected" ||
      (this.#tourGuideServicePort.isThereAnOngoingTourGuide() &&
        this.#tourGuideServicePort.ongoingTourGuideSectionData?.id ===
          sectionData?.id) ||
      (bookData.type === "StackBook" && bookData.getParentId("stackBibleId"))
    )
      return;

    this.#pieceHighlightServicePort.tryUnhighlightPiece({
      piece: book,
      source: UnhighlightRequestSources.UserUnfocus,
      pacing: HighlightPacings.Regular,
      delay: this.#bookInteractionConfigProviderPort.getDelay(
        BookInteractionDelays.UnhighlightBook
      ),
    });
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
