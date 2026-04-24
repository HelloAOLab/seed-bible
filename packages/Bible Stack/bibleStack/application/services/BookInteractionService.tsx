import type {
  BookDataRepositoryPort,
  BookInteractionServicePort,
  BookSelectionServicePort,
  PieceAdapterPort,
  SequenceStateServicePort,
} from "bibleStack.application.ports.books";
import {
  BibleState,
  BibleVisualizationState,
  PieceSelectionSources,
  SelectionModalities,
  type Piece,
  type SelectionModality,
} from "bibleVizUtils.domain.models.canvas";
import type {
  PieceHierarchyServicePort,
  PieceHighlightServicePort,
  StackParentDataIds,
} from "bibleStack.application.ports.pieces";
import type { TourGuideServicePort } from "bibleStack.application.ports.tourGuide";
import { HighlightRequestSources } from "../../domain/models/pieces";
import type { ExplodedViewServicePort } from "bibleStack.application.ports.explodedView";

interface ServiceParams {
  bookDataRepositoryPort: BookDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  tourGuideServicePort: TourGuideServicePort;
  bookSelectionServicePort: BookSelectionServicePort;
  pieceHighlightServicePort: PieceHighlightServicePort;
  explodedViewServicePort: ExplodedViewServicePort;
  sequenceStateServicePort: SequenceStateServicePort;
  pieceAdapterPort: PieceAdapterPort;
}

export class BookInteractionService implements BookInteractionServicePort {
  #bookDataRepositoryPort: ServiceParams["bookDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #tourGuideServicePort: ServiceParams["tourGuideServicePort"];
  #bookSelectionServicePort: ServiceParams["bookSelectionServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];
  #explodedViewServicePort: ServiceParams["explodedViewServicePort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];

  constructor({
    bookDataRepositoryPort,
    pieceHierarchyServicePort,
    tourGuideServicePort,
    bookSelectionServicePort,
    pieceHighlightServicePort,
    explodedViewServicePort,
    sequenceStateServicePort,
    pieceAdapterPort,
  }: ServiceParams) {
    this.#bookDataRepositoryPort = bookDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#tourGuideServicePort = tourGuideServicePort;
    this.#bookSelectionServicePort = bookSelectionServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#explodedViewServicePort = explodedViewServicePort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#pieceAdapterPort = pieceAdapterPort;
  }

  handleBookClick({
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

    if (bibleData?.currentState !== BibleState.Open) {
      return;
    }

    if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
      // TODO: Refactor the logic to highlight pieces to match the Clean Architecture
      BibleVizUtils.Functions.HighlightBiblePiece({ data: bookData });
    } else {
      switch (interaction) {
        case SelectionModalities.Precise:
          {
            if (!bookData?.isSelected) {
              if (this.#tourGuideServicePort.isThereAnOngoingTourGuide()) {
                if (
                  sectionData?.piece &&
                  this.#tourGuideServicePort.ongoingTourGuideSectionData?.id ===
                    sectionData.id
                ) {
                  this.#tourGuideServicePort.stopTourGuide();
                }
              } else {
                if (bookData.isPieceHighlighted()) {
                  this.#bookSelectionServicePort.selectBook(
                    bookData,
                    PieceSelectionSources.UserSelection
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
              if (bookData.isSelected) {
                this.#bookSelectionServicePort.deselectBook(bookData);
              } else {
                this.#bookSelectionServicePort.selectBook(
                  bookData,
                  PieceSelectionSources.StackUserPresenceUpdate
                );
              }
            } else if (
              bookData.getParentId("stackBibleId") &&
              bibleData &&
              bibleData.currentStackVizState === BibleVisualizationState.Regular
            ) {
              this.#explodedViewServicePort.explodeSection(sectionData);
            }
          }
          break;
        default:
          break;
      }
    }
  }

  handleBookDrag: ({
    book,
  }: {
    book: Piece<"StackBook" | "StackSectionBook">;
  }) => void = ({ book }) => {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const bookData = this.#bookDataRepositoryPort.getPieceData(book);

    if (!bookData) {
      throw new Error(
        "BookInteractionService: bookData not found at handleBookDrag."
      );
    }

    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      bookData.parentDataIds as StackParentDataIds
    );

    if (
      bibleData?.currentState !== BibleState.Open ||
      this.#pieceAdapterPort.isPieceAnchored(book)
    )
      return;

    shout("OnStackPieceDrag", { piece: book, data: bookData });
  };
}
