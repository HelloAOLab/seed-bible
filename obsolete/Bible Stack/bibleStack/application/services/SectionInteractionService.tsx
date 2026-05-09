import {
  BibleState,
  PieceSelectionSources,
  SelectionModalities,
  type Piece,
  type SelectionModality,
} from "bibleVizUtils.domain.models.canvas";
import type {
  SectionInteractionServicePort,
  SectionSelectionServicePort,
} from "bibleStack.application.ports.sections";
import type {
  PieceHierarchyServicePort,
  PieceHighlightServicePort,
  StackParentDataIds,
} from "bibleStack.application.ports.pieces";
import type { TourGuideServicePort } from "bibleStack.application.ports.tourGuide";
import type { PieceDataRepositoryPort } from "bibleStack.application.ports.pieces";
import type { SectionInteractionConfigProviderPort } from "bibleStack.infrastructure.ports.sectionInteraction";
import {
  HighlightRequestSources,
  HighlightPacings,
  UnhighlightRequestSources,
} from "../../domain/models/pieces";
import { SectionInteractionDelays } from "bibleStack.infrastructure.config.sectionInteraction.delays";

type SectionDataRepositoryPort = Pick<PieceDataRepositoryPort, "getPieceData">;

interface ServiceParams {
  sectionDataRepositoryPort: SectionDataRepositoryPort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  tourGuideServicePort: TourGuideServicePort;
  pieceHighlightServicePort: PieceHighlightServicePort;
  sectionInteractionConfigProviderPort: SectionInteractionConfigProviderPort;
  sectionSelectionServicePort: SectionSelectionServicePort;
}

export class SectionInteractionService implements SectionInteractionServicePort {
  #sectionDataRepositoryPort: ServiceParams["sectionDataRepositoryPort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #tourGuideServicePort: ServiceParams["tourGuideServicePort"];
  #pieceHighlightServicePort: ServiceParams["pieceHighlightServicePort"];
  #sectionInteractionConfigProviderPort: ServiceParams["sectionInteractionConfigProviderPort"];
  #sectionSelectionServicePort: ServiceParams["sectionSelectionServicePort"];

  constructor({
    sectionDataRepositoryPort,
    pieceHierarchyServicePort,
    tourGuideServicePort,
    pieceHighlightServicePort,
    sectionInteractionConfigProviderPort,
    sectionSelectionServicePort,
  }: ServiceParams) {
    this.#sectionDataRepositoryPort = sectionDataRepositoryPort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#tourGuideServicePort = tourGuideServicePort;
    this.#pieceHighlightServicePort = pieceHighlightServicePort;
    this.#sectionInteractionConfigProviderPort =
      sectionInteractionConfigProviderPort;
    this.#sectionSelectionServicePort = sectionSelectionServicePort;
  }

  #meetsBaseInteractionConditions(section: Piece<"StackSection">) {
    const sectionData = this.#sectionDataRepositoryPort.getPieceData(section);

    if (!sectionData) {
      throw new Error(
        "SectionInteractionService: sectionData not found at meetsBaseInteractionConditions"
      );
    }

    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      sectionData.parentDataIds as StackParentDataIds
    );

    if (
      bibleData?.currentState === BibleState.Closed ||
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

    if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
      BibleVizUtils.Functions.HighlightBiblePiece({ data: sectionData });
    } else {
      switch (interaction) {
        case SelectionModalities.Precise: {
          if (sectionData.highlightState === "Highlighted") {
            if (!sectionData.isSplitIntoBooks) {
              this.#sectionSelectionServicePort.selectSection({
                data: sectionData,
                source: PieceSelectionSources.UserSelection,
              });
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
          this.#sectionSelectionServicePort.selectSection({
            data: sectionData,
            source: PieceSelectionSources.UserSelection,
          });
          break;
        }
      }
    }
  }

  handleSectionFocusBegin(section: Piece<"StackSection">): void {
    const sectionData = this.#sectionDataRepositoryPort.getPieceData(section);

    if (!sectionData) {
      throw new Error(
        "SectionInteractionService: sectionData not found at handleSectionFocusBegin"
      );
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
      throw new Error(
        "SectionInteractionService: sectionData not found at handleSectionFocusEnd"
      );
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
