// Service import
import { BookInteractionService } from "bibleStack.application.services.BookInteractionService";
import { PieceHierarchyService } from "bibleStack.application.services.PieceHierarchyService";
import { TourGuideService } from "bibleStack.application.services.TourGuideService";
import { BookSelectionService } from "bibleStack.application.services.BookSelectionService";
import { PieceHighlightService } from "bibleStack.application.services.PieceHighlightService";
import { ExplodedViewService } from "bibleStack.application.services.ExplodedViewService";

// Adapters import
import { PieceDataRepository } from "bibleStack.infrastructure.adapters.stacks.PieceDataRepository";
import { BibleDataRepository } from "bibleStack.infrastructure.adapters.stacks.BibleDataRepository";
import { TourGuideAdapter } from "bibleStack.infrastructure.adapters.stacks.TourGuideAdapter";

// Controller import
import { BookInteractionController } from "bibleStack.infrastructure.controllers.stack.BookInteractionController";
import { TestamentInteractionController } from "bibleStack.infrastructure.controllers.stack.TestamentInteractionController";
import { SectionInteractionController } from "bibleStack.infrastructure.controllers.stack.SectionInteractionController";
import { ChapterInteractionController } from "bibleStack.infrastructure.controllers.stack.ChapterInteractionController";
import { ExperienceController } from "bibleStack.infrastructure.controllers.experience.ExperienceController";

// API Import
import { bibleVizAPI } from "bibleVizUtils.infrastructure.di.bootstrap";
import {
  BiblePiece,
  type Piece,
} from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";

export let bookInteractionController: BookInteractionController | undefined =
  undefined;
export let testamentInteractionController:
  | TestamentInteractionController
  | undefined = undefined;
export let sectionInteractionController:
  | SectionInteractionController
  | undefined = undefined;
export let chapterInteractionController:
  | ChapterInteractionController
  | undefined = undefined;
export let experienceController: ExperienceController | undefined = undefined;

const disposeFunctions: (() => void)[] = [];

let isInitialized = false;

export const bootstrapApp = () => {
  if (isInitialized) {
    return;
  }
  isInitialized = true;
  console.log(`Initializing Bible Stack.`);

  // 1. Instantiating adapters

  const pieceDataRepository = new PieceDataRepository();
  const bibleDataRepository = new BibleDataRepository();
  const tourGuideAdapter = new TourGuideAdapter();

  // 2, Instantiating services

  const stackPieceLabelService = bibleVizAPI?.createPieceLabelService({
    [BiblePiece.StackTestament]: {
      getLabel: (piece: Piece<"StackTestament">) => {
        const data = pieceDataRepository.getPieceData(piece);
        if (!data) {
          throw new Error(
            `BibleStack bootstrap: data not found at getLabel at createPieceLabelService`
          );
        }
        return data.getPieceInfoProperty("name");
      },
      getDate: (piece: Piece<"StackTestament">) => undefined, // TODO: Properly find the date
      getColor: (piece: Piece<"StackTestament">) => {
        const data = pieceDataRepository.getPieceData(piece);
        if (!data) {
          throw new Error(
            `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
          );
        }
        return data.getPieceInfoProperty("color") ?? "#ffffff"; // TODO: Properly find the color
      },
      getLabelColor: (piece: Piece<"StackTestament">) => {
        const data = pieceDataRepository.getPieceData(piece);
        if (!data) {
          throw new Error(
            `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
          );
        }
        return data.getPieceInfoProperty("color") ?? "#ffffff"; // TODO: Properly find the color
      },
      labelPositioning: "LeftSided",
      isInteractable: true,
    },
    [BiblePiece.StackSection]: {
      getLabel: (piece: Piece<"StackSection">) => {
        const data = pieceDataRepository.getPieceData(piece);
        if (!data) {
          throw new Error(
            `BibleStack bootstrap: data not found at getLabel at createPieceLabelService`
          );
        }
        return data.getPieceInfoProperty("name");
      },
      getDate: (piece: Piece<"StackSection">) => undefined, // TODO: Properly find the date
      getColor: (piece: Piece<"StackSection">) => {
        const data = pieceDataRepository.getPieceData(piece);
        if (!data) {
          throw new Error(
            `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
          );
        }
        return data.getPieceInfoProperty("color") ?? "#ffffff"; // TODO: Properly find the color
      },
      getLabelColor: (piece: Piece<"StackSection">) => {
        const data = pieceDataRepository.getPieceData(piece);
        if (!data) {
          throw new Error(
            `BibleStack bootstrap: data not found at getColor at createPieceLabelService`
          );
        }
        return data.getPieceInfoProperty("color") ?? "#ffffff"; // TODO: Properly find the color
      },
      labelPositioning: "LeftSided",
      isInteractable: true,
    },
    [BiblePiece.StackSectionShadow]: {
      getLabel: (piece: Piece<"StackSectionShadow">) => {
        return "";
      },
      getDate: (piece: Piece<"StackSectionShadow">) => undefined, // TODO: Properly find the date
      getColor: (piece: Piece<"StackSectionShadow">) => {
        return "";
      },
      getLabelColor: (piece: Piece<"StackSectionShadow">) => {
        return "";
      },
      labelPositioning: "LeftSided",
      isInteractable: true,
    },
    [BiblePiece.StackSectionBook]: {
      getLabel: (piece: Piece<"StackSectionBook">) => {
        return "";
      },
      getDate: (piece: Piece<"StackSectionBook">) => undefined, // TODO: Properly find the date
      getColor: (piece: Piece<"StackSectionBook">) => {
        return "";
      },
      getLabelColor: (piece: Piece<"StackSectionBook">) => {
        return "";
      },
      labelPositioning: "LeftSided",
      isInteractable: true,
    },
    [BiblePiece.StackBook]: {
      getLabel: (piece: Piece<"StackBook">) => {
        return "";
      },
      getDate: (piece: Piece<"StackBook">) => undefined, // TODO: Properly find the date
      getColor: (piece: Piece<"StackBook">) => {
        return "";
      },
      getLabelColor: (piece: Piece<"StackBook">) => {
        return "";
      },
      labelPositioning: "LeftSided",
      isInteractable: true,
    },
    [BiblePiece.StackChapter]: {
      getLabel: (piece: Piece<"StackChapter">) => {
        return "";
      },
      getDate: (piece: Piece<"StackChapter">) => undefined, // TODO: Properly find the date
      getColor: (piece: Piece<"StackChapter">) => {
        return "";
      },
      getLabelColor: (piece: Piece<"StackChapter">) => {
        return "";
      },
      labelPositioning: "LeftSided",
      isInteractable: true,
    },
  });
  const pieceHighlightService = new PieceHighlightService();
  const explodedViewService = new ExplodedViewService();
  const bookSelectionService = new BookSelectionService();
  const tourGuideService = new TourGuideService({
    tourGuieAdapterPort: tourGuideAdapter,
  });
  const pieceHierarchyService = new PieceHierarchyService({
    pieceDataRepositoryPort: pieceDataRepository,
    bibleDataRepositoryPort: bibleDataRepository,
  });
  const bookInteractionService = new BookInteractionService({
    bookDataRepositoryPort: pieceDataRepository,
    pieceHierarchyServicePort: pieceHierarchyService,
    tourGuideServicePort: tourGuideService,
    bookSelectionServicePort: bookSelectionService,
    pieceHighlightServicePort: pieceHighlightService,
    explodedViewServicePort: explodedViewService,
  });

  // 3. Instantiating controllers

  bookInteractionController = new BookInteractionController(
    bookInteractionService
  );

  testamentInteractionController = new TestamentInteractionController(
    {} as any
  );
  sectionInteractionController = new SectionInteractionController({} as any);
  chapterInteractionController = new ChapterInteractionController({} as any);
  experienceController = new ExperienceController();

  // 4. Event wiring
  // TODO: Wire events on the go

  // 5. Adding dispose functions to disposal list

  disposeFunctions
    .push
    // TODO: Create and add service dispose functions on the go
    ();

  console.log(`Bible Stack successfully initialized.`);
};

export const teardownApp = () => {
  if (!isInitialized) {
    return;
  }
  isInitialized = false;

  console.log(`Uninstalling Bible Stack.`);

  disposeFunctions.forEach((func) => func());
  bookInteractionController = undefined;
  testamentInteractionController = undefined;
  sectionInteractionController = undefined;
  chapterInteractionController = undefined;

  console.log(`Bible Stack successfully uninstalled.`);
};
