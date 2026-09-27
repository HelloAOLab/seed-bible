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
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import type { TourGuideServicePort } from "../ports/in/TourGuide";
import { HighlightRequestSources } from "../../domain/models/pieces";
import type { PaintPort } from "../ports/in/Paint";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { TestamentSelectionPort } from "../ports/in/TestamentSelection";
import type { StackTestamentData } from "../../domain/entities/StackTestamentData";
import type { LoggerPort } from "../ports/out/Logger";
import type { ParentDataIds } from "../../domain/models/canvas";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  testamentDataRepositoryPort: TestamentDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  tourGuideServicePort: TourGuideServicePort;
  testamentSelectionServicePort: TestamentSelectionPort;
  pieceHighlightServicePort: PieceHighlighterPort;
  paintPort: PaintPort;
  loggerPort: LoggerPort;
}

export class TestamentInteractionService implements TestamentInteractionServicePort {
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #testamentDataRepositoryPort: ServiceParams["testamentDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #tourGuideServicePort: ServiceParams["tourGuideServicePort"];
  #testamentSelectionServicePort: ServiceParams["testamentSelectionServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];
  #paintPort: ServiceParams["paintPort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    sequenceStateServicePort,
    testamentDataRepositoryPort,
    pieceHierarchyServicePort,
    tourGuideServicePort,
    testamentSelectionServicePort,
    pieceHighlightServicePort,
    paintPort,
    loggerPort,
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#testamentDataRepositoryPort = testamentDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#tourGuideServicePort = tourGuideServicePort;
    this.#testamentSelectionServicePort = testamentSelectionServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#paintPort = paintPort;
    this.#loggerPort = loggerPort;
  }

  #meetsBaseInteractionConditions(testamentData: StackTestamentData): boolean {
    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      testamentData.parentDataIds as ParentDataIds
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
      this.#loggerPort.error(
        "TestamentInteractionService: testamentData not found at handleTestamentSelection"
      );
      return;
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
      this.#loggerPort.error(
        "TestamentInteractionService: testamentData not found at handleTestamentFocusBegin"
      );
      return;
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
      this.#loggerPort.error(
        "TestamentInteractionService: testamentData not found at handleTestamentFocusEnd"
      );
      return;
    }

    testamentData.endFocus();
  }
}
