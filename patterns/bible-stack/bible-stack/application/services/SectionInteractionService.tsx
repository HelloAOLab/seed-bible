import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import {
  BibleStates,
  PieceSelectionSources,
  SelectionModalities,
  type Piece,
  type SelectionModality,
} from "../../domain/models/canvas";
import type { SectionInteractionServicePort } from "../ports/in/SectionInteraction";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import type { TourGuideServicePort } from "../ports/in/TourGuide";
import type { PieceDataRepositoryPort } from "../ports/pieces";
import type { SectionInteractionConfigProviderPort } from "../ports/out/SectionInteraction";
import {
  HighlightRequestSources,
  HighlightPacings,
  UnhighlightRequestSources,
} from "../../domain/models/pieces";
import { SectionInteractionDelays } from "../ports/out/SectionInteraction";
import type { SectionSelectionServicePort } from "../ports/in/SectionSelection";

import type { SequenceStateServicePort } from "../ports/in/SequenceState";
import type { PaintPort } from "../ports/in/Paint";
import type { LoggerPort } from "../ports/out/Logger";

type SectionDataRepositoryPort = Pick<PieceDataRepositoryPort, "getPieceData">;

interface ServiceParams {
  sectionDataRepositoryPort: SectionDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  tourGuideServicePort: TourGuideServicePort;
  pieceHighlightServicePort: PieceHighlighterPort;
  sectionInteractionConfigProviderPort: SectionInteractionConfigProviderPort;
  sequenceStateServicePort: SequenceStateServicePort;
  sectionSelectionServicePort: SectionSelectionServicePort;
  paintPort: PaintPort;
  loggerPort: LoggerPort;
}

export class SectionInteractionService implements SectionInteractionServicePort {
  #sectionDataRepositoryPort: ServiceParams["sectionDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #tourGuideServicePort: ServiceParams["tourGuideServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];
  #sectionInteractionConfigProviderPort: ServiceParams["sectionInteractionConfigProviderPort"];
  #sectionSelectionServicePort: ServiceParams["sectionSelectionServicePort"];
  #sequenceStateServicePort: ServiceParams["sequenceStateServicePort"];
  #paintPort: ServiceParams["paintPort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    sectionDataRepositoryPort,
    pieceHierarchyServicePort,
    tourGuideServicePort,
    pieceHighlightServicePort,
    sectionInteractionConfigProviderPort,
    sectionSelectionServicePort,
    sequenceStateServicePort,
    paintPort,
    loggerPort,
  }: ServiceParams) {
    this.#sectionDataRepositoryPort = sectionDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#tourGuideServicePort = tourGuideServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#sectionInteractionConfigProviderPort =
      sectionInteractionConfigProviderPort;
    this.#sectionSelectionServicePort = sectionSelectionServicePort;
    this.#sequenceStateServicePort = sequenceStateServicePort;
    this.#paintPort = paintPort;
    this.#loggerPort = loggerPort;
  }

  #meetsBaseInteractionConditions(section: Piece<"StackSection">) {
    const sectionData = this.#sectionDataRepositoryPort.getPieceData(section);

    if (!sectionData) {
      this.#loggerPort.error(
        "SectionInteractionService: sectionData not found at meetsBaseInteractionConditions"
      );
      return false;
    }

    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      sectionData.parentDataIds ?? {}
    );

    if (
      (bibleData && bibleData.currentState === BibleStates.Closed) ||
      this.#tourGuideServicePort.isThereAnOngoingTourGuide()
    )
      return false;

    return { sectionData };
  }

  handleSectionSelection({
    section,
    interaction,
  }: {
    section: Piece<"StackSection">;
    interaction: SelectionModality;
  }): void {
    const result = this.#meetsBaseInteractionConditions(section);

    if (!result) return;

    const { sectionData } = result;

    if (
      sectionData.highlightState === "Highlighting" ||
      sectionData.highlightState === "Unhighlighting"
    ) {
      return;
    }

    if (this.#paintPort.isActive) {
      this.#paintPort.paint(sectionData);
    } else {
      switch (interaction) {
        case SelectionModalities.Precise: {
          if (sectionData.highlightState === "Highlighted") {
            if (!sectionData.isSplitIntoBooks) {
              this.#sequenceStateServicePort.executeAsSequence(() =>
                this.#sectionSelectionServicePort.select({
                  data: sectionData,
                  source: PieceSelectionSources.UserSelection,
                })
              );
            }
          } else {
            this.#pieceHighlightServicePort.tryHighlightPiece({
              piece: section,
              source: HighlightRequestSources.UserSelection,
            });
          }
          break;
        }
        case SelectionModalities.Coarse: {
          this.#sequenceStateServicePort.executeAsSequence(() =>
            this.#sectionSelectionServicePort.select({
              data: sectionData,
              source: PieceSelectionSources.UserSelection,
            })
          );
          break;
        }
      }
    }
  }

  handleSectionFocusBegin(section: Piece<"StackSection">): void {
    const sectionData = this.#sectionDataRepositoryPort.getPieceData(section);

    if (!sectionData) {
      this.#loggerPort.error(
        "SectionInteractionService: sectionData not found at handleSectionFocusBegin"
      );
      return;
    }

    sectionData.beginFocus();

    const result = this.#meetsBaseInteractionConditions(section);

    if (!result) return;

    this.#pieceHighlightServicePort.tryHighlightPiece({
      piece: section,
      source: HighlightRequestSources.UserFocus,
    });
  }

  handleSectionFocusEnd(section: Piece<"StackSection">): void {
    const sectionData = this.#sectionDataRepositoryPort.getPieceData(section);

    if (!sectionData) {
      this.#loggerPort.error(
        "SectionInteractionService: sectionData not found at handleSectionFocusEnd"
      );
      return;
    }

    sectionData.endFocus();

    const result = this.#meetsBaseInteractionConditions(section);

    if (!result) return;

    if (sectionData.isSplitIntoBooks) return;

    this.#pieceHighlightServicePort.tryUnhighlightPiece({
      piece: section,
      source: UnhighlightRequestSources.UserUnfocus,
      pacing: HighlightPacings.Regular,
      delay: this.#sectionInteractionConfigProviderPort.getDelay(
        SectionInteractionDelays.UnhighlightSection
      ),
    });
  }
}
