import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { SectionShadowInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SectionShadowInteractionService";
import type { SectionSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionSelection";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type { TourGuideServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TourGuide";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type { PieceDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/SectionShadowInteraction";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import type { SectionInfo } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import type {
  Piece,
  SectionShadow,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import {
  makeSectionSelectionServiceDouble,
  makeSequenceStateServiceDouble,
} from "../serviceDoubles";

const SECTION_ID = "section-id";

const sectionShadow: SectionShadow = {
  id: "section-shadow-id",
  type: "StackSectionShadow",
  sectionDataId: SECTION_ID,
};

const sectionPiece: Piece<"StackSection"> = {
  id: "section-piece",
  type: "StackSection",
};

const sectionInfo: SectionInfo = {
  name: "section",
  color: "#ffffff",
  books: [],
  path: {
    arrangementName: "arrangement",
    testamentIndex: 0,
    sectionIndex: 0,
  },
};

const makeSectionData = (): StackSectionData =>
  new StackSectionData({
    id: SECTION_ID,
    piece: sectionPiece,
    pieceInfo: sectionInfo,
    parentDataIds: {
      stackBibleId: "bible-id",
      stackTestamentId: "testament-id",
    },
    isSplitIntoBooks: false,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

describe("pattern.bible-stack.application.services.SectionShadowInteractionService", () => {
  let service: SectionShadowInteractionService;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;
  let sectionSelectionServicePort: Mocked<SectionSelectionServicePort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let tourGuideServicePort: Mocked<TourGuideServicePort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    pieceDataRepositoryPort = {
      getDataById: vi.fn(),
    } as unknown as Mocked<PieceDataRepositoryPort>;

    sectionSelectionServicePort = makeSectionSelectionServiceDouble({
      select: vi.fn(async () => {}),
      deselect: vi.fn(async () => {}),
    });

    sequenceStateServicePort = makeSequenceStateServiceDouble({
      isThereAnOngoingSequence: vi.fn(() => false),
      executeAsSequence: vi.fn(async (task: () => Promise<void>) => {
        await task();
      }),
    });

    tourGuideServicePort = {
      ongoingTourGuideSectionData:
        undefined as unknown as TourGuideServicePort["ongoingTourGuideSectionData"],
      isThereAnOngoingTourGuide: vi.fn(() => false),
      beginTourGuide: vi.fn(),
      stopTourGuide: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new SectionShadowInteractionService({
      pieceDataRepositoryPort,
      sectionSelectionServicePort,
      sequenceStateServicePort,
      tourGuideServicePort,
      loggerPort,
    });
  });

  describe("handleSectionShadowSelected", () => {
    it("no-ops if there's an ongoing sequence", () => {
      sequenceStateServicePort.isThereAnOngoingSequence.mockReturnValue(true);
      pieceDataRepositoryPort.getDataById.mockReturnValue(makeSectionData());

      service.handleSectionShadowSelected(sectionShadow);

      expect(pieceDataRepositoryPort.getDataById).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(sectionSelectionServicePort.deselect).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("no-ops if there's an ongoing tour guide", () => {
      tourGuideServicePort.isThereAnOngoingTourGuide.mockReturnValue(true);
      pieceDataRepositoryPort.getDataById.mockReturnValue(makeSectionData());

      service.handleSectionShadowSelected(sectionShadow);

      expect(pieceDataRepositoryPort.getDataById).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(sectionSelectionServicePort.deselect).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("logs an error and no-ops if no data found", () => {
      pieceDataRepositoryPort.getDataById.mockReturnValue(undefined);

      service.handleSectionShadowSelected(sectionShadow);

      expect(
        pieceDataRepositoryPort.getDataById
      ).toHaveBeenCalledExactlyOnceWith({
        type: "StackSection",
        id: sectionShadow.sectionDataId,
      });
      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        "SectionShadowInteractionService: sectionData not found at handleSectionShadowSelected."
      );
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(sectionSelectionServicePort.deselect).not.toHaveBeenCalled();
    });

    it("executes the deselection as a sequence", () => {
      const sectionData = makeSectionData();
      pieceDataRepositoryPort.getDataById.mockReturnValue(sectionData);

      service.handleSectionShadowSelected(sectionShadow);

      expect(
        pieceDataRepositoryPort.getDataById
      ).toHaveBeenCalledExactlyOnceWith({
        type: "StackSection",
        id: sectionShadow.sectionDataId,
      });
      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledOnce();
      expect(
        sectionSelectionServicePort.deselect
      ).toHaveBeenCalledExactlyOnceWith(sectionData);
      expect(sectionSelectionServicePort.select).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });
});
