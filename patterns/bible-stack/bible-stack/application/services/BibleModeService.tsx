import type { StackBibleData } from "../../domain/entities/StackBibleData";
import {
  BibleStates,
  BibleVisualizationStates,
  ExplodeStackActions,
  type Piece,
} from "../../domain/models/canvas";
import type { BibleStackUpdaterPort } from "../ports/in/BibleStackUpdater";
import type { ExplodedViewServicePort } from "../ports/in/ExplodedView";
import type { SectionSelectionServicePort } from "../ports/in/SectionSelection";
import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type {
  BibleModeSequenceAdapterPort,
  PieceDataRepositoryPort,
} from "../ports/out/BibleMode";
import type { TestamentSelectionPort } from "../ports/in/TestamentSelection";
import type { BibleModeServicePort } from "../ports/in/BibleMode";

interface ServiceParams {
  sequenceStateServicePort: SequenceStateServicePort;
  sequenceAdapterPort: BibleModeSequenceAdapterPort;
  bibleStackUpdaterPort: BibleStackUpdaterPort;
  explodedViewServicePort: ExplodedViewServicePort;
  pieceDataRepository: PieceDataRepositoryPort;
  sectionSelectionServicePort: SectionSelectionServicePort;
  testamentSelectionServicePort: TestamentSelectionPort;
}

export class BibleModeService implements BibleModeServicePort {
  #isTryingToToggle: boolean = false;
  #isStopping: boolean = false;
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #sequenceAdapterPort: ServiceParams["sequenceAdapterPort"];
  #bibleStackUpdaterPort: ServiceParams["bibleStackUpdaterPort"];
  #explodedViewServicePort: ServiceParams["explodedViewServicePort"];
  #pieceDataRepository: ServiceParams["pieceDataRepository"];
  #sectionSelectionServicePort: ServiceParams["sectionSelectionServicePort"];
  #testamentSelectionServicePort: ServiceParams["testamentSelectionServicePort"];

  constructor({
    sequenceStateServicePort,
    sequenceAdapterPort,
    bibleStackUpdaterPort,
    explodedViewServicePort,
    pieceDataRepository,
    sectionSelectionServicePort,
    testamentSelectionServicePort,
  }: ServiceParams) {
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#sequenceAdapterPort = sequenceAdapterPort;
    this.#bibleStackUpdaterPort = bibleStackUpdaterPort;
    this.#explodedViewServicePort = explodedViewServicePort;
    this.#pieceDataRepository = pieceDataRepository;
    this.#sectionSelectionServicePort = sectionSelectionServicePort;
    this.#testamentSelectionServicePort = testamentSelectionServicePort;
  }

  async tryToggleMode(bibleData: StackBibleData) {
    if (
      this.#sequenceStateServicePort.isThereAnOngoingSequence() ||
      this.#isTryingToToggle ||
      this.#isStopping ||
      bibleData.currentState !== BibleStates.Open
    )
      return;

    const crossHorizontalLine = bibleData.getStaticPiece("crossHorizontalLine");
    const crossVerticalLine = bibleData.getStaticPiece("crossVerticalLine");

    if (!crossHorizontalLine) {
      throw new Error(
        "BibleModeService: crossHorizontalLine not found at tryToggleMode."
      );
    }

    if (!crossVerticalLine) {
      throw new Error(
        "BibleModeService: crossVerticalLine not found at tryToggleMode."
      );
    }

    this.#isTryingToToggle = true;
    // TODO: Emit an event that will liste the interaction registry to register this bible as the last interacted.
    await this.#sequenceAdapterPort
      .showToggleAttemptFeedback({
        crossHorizontalLine,
        crossVerticalLine,
      })
      .then(() => {
        this.#isTryingToToggle = false;
        this.#sequenceAdapterPort.finishToggleAttemptFeedback({
          crossHorizontalLine,
          crossVerticalLine,
        });
        return this.#toggleMode(bibleData);
      });
  }

  async tryStopToggle(bibleData: StackBibleData) {
    if (!this.#isTryingToToggle || this.#isStopping) return;

    const crossHorizontalLine = bibleData.getStaticPiece("crossHorizontalLine");
    const crossVerticalLine = bibleData.getStaticPiece("crossVerticalLine");

    if (!crossHorizontalLine) {
      throw new Error(
        "BibleModeService: crossHorizontalLine not found at tryToggleMode."
      );
    }

    if (!crossVerticalLine) {
      throw new Error(
        "BibleModeService: crossVerticalLine not found at tryToggleMode."
      );
    }

    this.#isStopping = true;

    await this.#sequenceAdapterPort.showAttemptStopFeedback({
      crossHorizontalLine,
      crossVerticalLine,
    });
    this.#isTryingToToggle = false;
    this.#isStopping = false;
  }

  async #toggleMode(bibleData: StackBibleData) {
    switch (bibleData.currentStackVizState) {
      case BibleVisualizationStates.Regular:
        {
          bibleData.changeVizState(BibleVisualizationStates.Expanded);
          await this.#explodeAllSections(bibleData);
        }
        break;
      case BibleVisualizationStates.Expanded:
        {
          bibleData.changeVizState(BibleVisualizationStates.Regular);
          bibleData.implodeAllSections();
        }
        break;
    }
    await this.#bibleStackUpdaterPort.update({
      data: bibleData,
      pacing: "Regular",
    });
  }

  async #explodeAllSections(bibleData: StackBibleData) {
    const callUpdateStacks = bibleData.tryExplodeSplitSections();
    if (callUpdateStacks)
      await this.#bibleStackUpdaterPort.update({
        data: bibleData,
        pacing: "Regular",
      });

    const plan = bibleData.getExplodeAnimationPlan();

    for (const command of plan) {
      const { action, piece } = command;
      switch (action) {
        case ExplodeStackActions.ExplodeSection:
          {
            const sectionData = this.#pieceDataRepository.getPieceData(
              piece as Piece<"StackSection">
            );
            if (!sectionData) {
              throw new Error(
                "BibleModeService: sectionData not found at explodeAllSections"
              );
            }
            await this.#explodedViewServicePort.explodeSection({
              data: sectionData,
            });
          }
          break;
        case ExplodeStackActions.SelectSection:
          {
            const sectionData = this.#pieceDataRepository.getPieceData(
              piece as Piece<"StackSection">
            );
            if (!sectionData) {
              throw new Error(
                "BibleModeService: sectionData not found at explodeAllSections"
              );
            }
            await this.#sectionSelectionServicePort.select({
              data: sectionData,
              source: "Unknown",
            });
          }
          break;
        case ExplodeStackActions.SelectTestament:
          {
            const testamentData = this.#pieceDataRepository.getPieceData(
              piece as Piece<"StackTestament">
            );
            if (!testamentData) {
              throw new Error(
                "BibleModeService: testamentData not found at explodeAllSections"
              );
            }
            await this.#testamentSelectionServicePort.select({
              data: testamentData,
              source: "Unknown",
            });
          }
          break;
      }
    }
  }
}
