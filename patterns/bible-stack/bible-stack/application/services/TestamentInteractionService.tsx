import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import {
  BibleStates,
  PieceSelectionSources,
  SelectionModalities,
  type Piece,
  type SelectionModality,
} from "../../domain/models/canvas";
import type { TestamentDataRepositoryPort } from "../ports/testaments";
import type { TestamentInteractionServicePort } from "../ports/in/TestamentInteraction";
import type { StackParentDataIds } from "../ports/pieces";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import type { TourGuideServicePort } from "../ports/in/TourGuide";
import { HighlightRequestSources } from "../../domain/models/pieces";
import type { PaintPort } from "../ports/in/Paint";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { TestamentSelectionPort } from "../ports/in/TestamentSelection";
import type { StackTestamentData } from "../../domain/entities/StackTestamentData";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  testamentDataRepositoryPort: TestamentDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  tourGuideServicePort: TourGuideServicePort;
  testamentSelectionServicePort: TestamentSelectionPort;
  pieceHighlightServicePort: PieceHighlighterPort;
  paintPort: PaintPort;
}

export class TestamentInteractionService implements TestamentInteractionServicePort {
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #testamentDataRepositoryPort: ServiceParams["testamentDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #tourGuideServicePort: ServiceParams["tourGuideServicePort"];
  #testamentSelectionServicePort: ServiceParams["testamentSelectionServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];
  #paintPort: ServiceParams["paintPort"];

  constructor({
    sequenceStateServicePort,
    testamentDataRepositoryPort,
    pieceHierarchyServicePort,
    tourGuideServicePort,
    testamentSelectionServicePort,
    pieceHighlightServicePort,
    paintPort,
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#testamentDataRepositoryPort = testamentDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#tourGuideServicePort = tourGuideServicePort;
    this.#testamentSelectionServicePort = testamentSelectionServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#paintPort = paintPort;
  }

  #meetsBaseInteractionConditions(testamentData: StackTestamentData): boolean {
    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      testamentData.parentDataIds as StackParentDataIds
    );

    if (
      bibleData?.currentState === BibleStates.Closed ||
      this.#tourGuideServicePort.isThereAnOngoingTourGuide()
    )
      return false;

    return true;
  }

  handleTestamentSelection({
    testament,
    interaction,
  }: {
    testament: Piece<"StackTestament">;
    interaction: SelectionModality;
  }): void {
    const testamentData =
      this.#testamentDataRepositoryPort.getPieceData(testament);

    if (!testamentData) {
      throw new Error(
        "TestamentInteractionService: testamentData not found at meetsBaseInteractionConditions"
      );
    }

    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const result = this.#meetsBaseInteractionConditions(testamentData);

    if (!result) {
      return;
    }

    if (this.#paintPort.isActive) {
      this.#paintPort.paint(testamentData);
    } else {
      switch (interaction) {
        case SelectionModalities.Precise:
          {
            if (testamentData.highlightState === "Highlighted") {
              this.#sequenceStateServicePort.executeAsSequence(() =>
                this.#testamentSelectionServicePort.select({
                  data: testamentData,
                  source: PieceSelectionSources.UserSelection,
                })
              );
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
            this.#sequenceStateServicePort.executeAsSequence(() =>
              this.#testamentSelectionServicePort.select({
                data: testamentData,
                source: PieceSelectionSources.UserSelection,
              })
            );
          }
          break;
      }
    }
  }

  handleTestamentFocusBegin(testament: Piece<"StackTestament">): void {
    const testamentData =
      this.#testamentDataRepositoryPort.getPieceData(testament);

    if (!testamentData) {
      throw new Error(
        "TestamentInteractionService: testamentData not found at meetsBaseInteractionConditions"
      );
    }

    testamentData.beginFocus();

    if (this.#sequenceStateServicePort.isThereAnOngoingSequence()) return;

    const result = this.#meetsBaseInteractionConditions(testamentData);

    if (!result) {
      return;
    }

    this.#pieceHighlightServicePort.tryHighlightPiece({
      piece: testament,
      source: HighlightRequestSources.UserFocus,
    });
  }

  handleTestamentFocusEnd(testament: Piece<"StackTestament">) {
    const testamentData =
      this.#testamentDataRepositoryPort.getPieceData(testament);

    if (!testamentData) {
      throw new Error(
        "TestamentInteractionService: testamentData not found at meetsBaseInteractionConditions"
      );
    }

    testamentData.endFocus();
  }
}
