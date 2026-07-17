import {
  BiblePieces,
  type Piece,
  type SectionShadow,
} from "../../../domain/models/canvas";
import { CapitalizeFirstLetter } from "../../../domain/functions/string";
import { ComputeDateLabelText } from "../../../domain/functions/time";
import type { LabelDateService } from "../../../application/services/LabelDateService";
import type { ScripturePiecesStateService } from "../../../application/services/ScripturePiecesStateService";
import type { PieceDataRepository } from "../../adapters/stacks/PieceDataRepository";
import type { VisualStateRegistry } from "../../adapters/stacks/VisualStateRegistry";
import type { BooksStaticInfoRepository } from "../../adapters/arrangement/BooksStaticInfoRepository";
import type { BookNamesProvider } from "../../adapters/arrangement/BookNamesProvider";
import type { TranslationsConfigProvider } from "../translation/TranslationsConfigProvider";
import type { ArrangementTranslationKey } from "../translation/ArrangementTranslations";

interface MakeLabelPropertiesStrategiesParams {
  pieceDataRepository: PieceDataRepository;
  visualStateRegistry: VisualStateRegistry;
  translationsConfigProvider: TranslationsConfigProvider;
  bookNamesProvider: BookNamesProvider;
  booksStaticInfoRepository: BooksStaticInfoRepository;
  labelDateService: LabelDateService;
  scripturePiecesStateService: ScripturePiecesStateService;
}

/**
 * Builds the per-piece label strategies consumed by `PieceLabelService`.
 * Extracted from the DI bootstrap; every bootstrap-scoped value it needs is
 * injected via params.
 */
export const makeLabelPropertiesStrategies = ({
  pieceDataRepository,
  visualStateRegistry,
  translationsConfigProvider,
  bookNamesProvider,
  booksStaticInfoRepository,
  labelDateService,
  scripturePiecesStateService,
}: MakeLabelPropertiesStrategiesParams) => ({
  [BiblePieces.StackTestament]: {
    getLabel: (piece: Piece<"StackTestament">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getLabel at createPieceLabelService`
        );
      }
      return data.getPieceInfoProperty("name");
    },
    getColor: (piece: Piece<"StackTestament">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
        );
      }
      return "#ffffff";
    },
    getLabelColor: (piece: Piece<"StackTestament">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
        );
      }
      return visualStateRegistry.getStateProperty({
        piece,
        property: "labelTextColor",
      });
    },
    getLabelPositioning: (piece: Piece<"StackTestament">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `bible-stack bootstrap: data not found at getLabelPositioning at pieceLabelService`
        );
      }
      return data.isOnTheGround ? "Top" : "LeftSided";
    },
    isInteractable: true,
    makesAttentionFeedback: false,
  },
  [BiblePieces.StackSection]: {
    getLabel: (piece: Piece<"StackSection">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getLabel at createPieceLabelService`
        );
      }
      let name: string | undefined;
      const translationKey = data.getPieceInfoProperty("translationKey");
      if (translationKey) {
        const translatedName =
          translationsConfigProvider.getArrangementTranslation(
            translationKey as ArrangementTranslationKey
          );
        if (translatedName) {
          name = translatedName;
        }
      }
      if (!name) {
        name = data.getPieceInfoProperty("name");
      }
      return CapitalizeFirstLetter(name.split("-").join(" "));
    },
    getColor: (piece: Piece<"StackSection">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
        );
      }
      return data.getPieceInfoProperty("color");
    },
    getLabelColor: (piece: Piece<"StackSection">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
        );
      }
      return visualStateRegistry.getStateProperty({
        piece,
        property: "labelTextColor",
      });
    },
    getLabelPositioning: (piece: Piece<"StackSection">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `bible-stack bootstrap: data not found at getLabelPositioning at pieceLabelService`
        );
      }
      return data.isOnTheGround ? "Top" : "LeftSided";
    },
    makesAttentionFeedback: true,
    isInteractable: true,
  },
  [BiblePieces.StackSectionShadow]: {
    getLabel: (piece: Piece<"StackSectionShadow">) => {
      const sectionData = pieceDataRepository.getDataById({
        type: "StackSection",
        id: (piece as SectionShadow).sectionDataId,
      });
      if (!sectionData) {
        throw new Error(
          "bible-stack bootstrap: sectionData not fonud at getLabel"
        );
      }
      let name: string | undefined;
      const translationKey = sectionData.getPieceInfoProperty("translationKey");
      if (translationKey) {
        const translatedName =
          translationsConfigProvider.getArrangementTranslation(
            translationKey as ArrangementTranslationKey
          );
        if (translatedName) {
          name = translatedName;
        }
      }
      if (!name) {
        name = sectionData.getPieceInfoProperty("name");
      }
      return CapitalizeFirstLetter(name.split("-").join(" "));
    },
    getColor: (piece: Piece<"StackSectionShadow">) => {
      const sectionData = pieceDataRepository.getDataById({
        type: "StackSection",
        id: (piece as SectionShadow).sectionDataId,
      });
      if (!sectionData) {
        throw new Error(
          "bible-stack bootstrap: sectionData not fonud at getLabel"
        );
      }
      if (!sectionData.piece) {
        throw new Error(
          "bible-stack bootstrap: sectionData.piede not defined at getLabel"
        );
      }
      return visualStateRegistry.getStateProperty({
        piece: sectionData.piece,
        property: "labelTextColor",
      });
    },
    getLabelColor: () => {
      return "#ffffff";
    },
    getLabelPositioning: (piece: Piece<"StackSectionShadow">) => {
      const sectionData = pieceDataRepository.getDataById({
        type: "StackSection",
        id: (piece as SectionShadow).sectionDataId,
      });
      if (!sectionData) {
        throw new Error(
          "bible-stack bootstrap: sectionData not fonud at getLabel"
        );
      }
      if (sectionData.isOnTheGround) {
        return "Top";
      }
      return "RightSidedCorner";
    },
    isInteractable: true,
    makesAttentionFeedback: false,
  },
  [BiblePieces.StackSectionBook]: {
    getLabel: (piece: Piece<"StackSectionBook">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getLabel at pieceLabelService`
        );
      }
      const bookId = data.getPieceBookInfoProperty("bookId");
      return bookNamesProvider.getBookName(bookId) ?? bookId;
    },
    getDate: (piece: Piece<"StackSectionBook">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getLabel at pieceLabelService`
        );
      }
      if (scripturePiecesStateService.shouldShowLabelDates) {
        const staticInfo = booksStaticInfoRepository.getBookStaticInfo(
          data.getPieceBookInfoProperty("bookId")
        );
        if (staticInfo) {
          const currentYear = new Date().getFullYear();
          return staticInfo.relativeDateRange
            ? ComputeDateLabelText({
                format: labelDateService.dateFormat,
                range: staticInfo.relativeDateRange,
                currentYear,
              })
            : undefined;
        }
      }
      return undefined;
    },
    getColor: (piece: Piece<"StackSectionBook">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getColor at pieceLabelService`
        );
      }
      if (data.selectionState === "Selected") {
        return visualStateRegistry.getStateProperty({
          piece,
          property: "labelTextColor",
        });
      }
      return "#ffffff";
    },
    getLabelColor: (piece: Piece<"StackSectionBook">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getLabelColor at pieceLabelService`
        );
      }
      if (data.selectionState === "Selected") {
        return "#ffffff";
      }
      return visualStateRegistry.getStateProperty({
        piece,
        property: "labelTextColor",
      });
    },
    getLabelPositioning: (piece: Piece<"StackSectionBook">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getLabelPositioning at pieceLabelService`
        );
      }
      return data.isOnTheGround ? "Top" : "LeftSided";
    },
    isInteractable: true,
    makesAttentionFeedback: true,
  },
  [BiblePieces.StackBook]: {
    getLabel: (piece: Piece<"StackBook">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getLabel at pieceLabelService`
        );
      }
      const bookId = data.getPieceInfoProperty("bookId");
      return bookNamesProvider.getBookName(bookId) ?? bookId;
    },
    getDate: (piece: Piece<"StackBook">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getLabel at pieceLabelService`
        );
      }
      if (scripturePiecesStateService.shouldShowLabelDates) {
        const staticInfo = booksStaticInfoRepository.getBookStaticInfo(
          data.getPieceInfoProperty("bookId")
        );
        if (staticInfo) {
          const currentYear = new Date().getFullYear();
          return staticInfo.relativeDateRange
            ? ComputeDateLabelText({
                format: labelDateService.dateFormat,
                range: staticInfo.relativeDateRange,
                currentYear,
              })
            : undefined;
        }
      }
      return undefined;
    },
    getColor: (piece: Piece<"StackBook">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getColor at pieceLabelService`
        );
      }
      if (data.selectionState === "Selected") {
        return visualStateRegistry.getStateProperty({
          piece,
          property: "labelTextColor",
        });
      }
      return "#ffffff";
    },
    getLabelColor: (piece: Piece<"StackBook">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getLabelColor at pieceLabelService`
        );
      }
      if (data.selectionState === "Selected") {
        return "#ffffff";
      }
      return visualStateRegistry.getStateProperty({
        piece,
        property: "labelTextColor",
      });
    },
    getLabelPositioning: (piece: Piece<"StackBook">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `BibleStack bootstrap: data not found at getLabelPositioning at pieceLabelService`
        );
      }
      return data.isOnTheGround ? "Top" : "LeftSided";
    },
    isInteractable: true,
    makesAttentionFeedback: true,
  },
  [BiblePieces.StackChapter]: {
    getLabel: (piece: Piece<"StackChapter">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `bible-stack bootstrap: data not found at getLabel at pieceLabelService`
        );
      }
      const bookId = data.getCreationParam("bookId");
      const bookName = bookNamesProvider.getBookName(bookId) ?? bookId;
      return `${bookName} ${data.getPieceInfoProperty("number")}`;
    },
    getColor: () => {
      return "#ffffff";
    },
    getLabelColor: () => {
      return "#000000";
    },
    getLabelPositioning: (piece: Piece<"StackChapter">) => {
      const data = pieceDataRepository.getPieceData(piece);
      if (!data) {
        throw new Error(
          `bible-Stack bootstrap: data not found at getLabelPositioning at pieceLabelService`
        );
      }
      return data.isOnTheGround ? "Top" : "LeftSided";
    },
    isInteractable: false,
    makesAttentionFeedback: false,
  },
});
