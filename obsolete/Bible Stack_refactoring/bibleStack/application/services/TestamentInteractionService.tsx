import {
  BibleState,
  PieceSelectionSources,
  SelectionModalities,
  type Piece,
  type SelectionModality,
} from "bibleVizUtils.domain.models.canvas";
import type {
  TestamentInteractionServicePort,
  SequenceStateServicePort,
  TestamentDataRepositoryPort,
  TestamentSelectionServicePort,
} from "bibleStack.application.ports.testaments";
import type {
  PieceHierarchyServicePort,
  PieceHighlightServicePort,
  StackParentDataIds,
} from "bibleStack.application.ports.pieces";
import type { TourGuideServicePort } from "bibleStack.application.ports.tourGuide";
import { HighlightRequestSources } from "../../domain/models/pieces";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  testamentDataRepositoryPort: TestamentDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  tourGuideServicePort: TourGuideServicePort;
  testamentSelectionServicePort: TestamentSelectionServicePort;
  pieceHighlightServicePort: PieceHighlightServicePort;
}

export class TestamentInteractionService implements TestamentInteractionServicePort {
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #testamentDataRepositoryPort: ServiceParams["testamentDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #tourGuideServicePort: ServiceParams["tourGuideServicePort"];
  #testamentSelectionServicePort: ServiceParams["testamentSelectionServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];

  constructor({
    sequenceStateServicePort,
    testamentDataRepositoryPort,
    pieceHierarchyServicePort,
    tourGuideServicePort,
    testamentSelectionServicePort,
    pieceHighlightServicePort,
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#testamentDataRepositoryPort = testamentDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#tourGuideServicePort = tourGuideServicePort;
    this.#testamentSelectionServicePort = testamentSelectionServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
  }

  #meetsBaseInteractionConditions(testament: Piece<"StackTestament">) {
    const testamentData =
      this.#testamentDataRepositoryPort.getPieceData(testament);

    if (!testamentData) {
      throw new Error(
        "TestamentInteractionService: testamentData not found at meetsBaseInteractionConditions"
      );
    }

    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      testamentData.parentDataIds as StackParentDataIds
    );

    if (
      bibleData?.currentState === BibleState.Closed ||
      this.#tourGuideServicePort.isThereAnOngoingTourGuide()
    )
      return false;

    return { testamentData };
  }

  handleTestamentSelection({
    testament,
    interaction,
  }: {
    testament: Piece<"StackTestament">;
    interaction: SelectionModality;
  }): void {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const result = this.#meetsBaseInteractionConditions(testament);

    if (!result) {
      return;
    }

    const { testamentData } = result;

    // TODO: Refactor the logic to highlight pieces to match the Clean Architecture
    if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
      BibleVizUtils.Functions.HighlightBiblePiece({
        data: testamentData,
      });
    } else {
      switch (interaction) {
        case SelectionModalities.Precise:
          {
            if (testamentData.highlightState === "Highlighted") {
              this.#testamentSelectionServicePort.selectTestament({
                data: testamentData,
                source: PieceSelectionSources.UserSelection,
              });
            } else {
              this.#pieceHighlightServicePort.tryHighlightPiece({
                piece: testament,
                source: HighlightRequestSources.UserSelection,
              });
            }
          }
          break;
        case SelectionModalities.Coarse:
          {
            this.#testamentSelectionServicePort.selectTestament({
              data: testamentData,
              source: PieceSelectionSources.UserSelection,
            });
          }
          break;
      }
    }
  }

  handleTestamentFocusBegin(testament: Piece<"StackTestament">): void {
    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const result = this.#meetsBaseInteractionConditions(testament);

    if (!result) {
      return;
    }

    this.#pieceHighlightServicePort.tryHighlightPiece({
      piece: testament,
      source: HighlightRequestSources.UserFocus,
    });
  }
}
