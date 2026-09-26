import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { SectionInteractionService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SectionInteractionService";
import type { PaintPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Paint";
import type { PieceHierarchyServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHierarchy";
import type { PieceHighlighterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/PieceHighlight";
import type { SectionSelectionServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SectionSelection";
import type { SequenceStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/SequenceState";
import type { TourGuideServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/TourGuide";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import {
  SectionInteractionDelays,
  type SectionInteractionConfigProviderPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/SectionInteraction";
import type {
  ParentDataChain,
  PieceDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import type { SectionInfo } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleStates,
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  PieceSelectionSources,
  SelectionModalities,
  type BibleState,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import {
  HighlightEvents,
  HighlightStates,
  type HighlightState,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/highlight";
import {
  HighlightPacings,
  HighlightRequestSources,
  UnhighlightRequestSources,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/pieces";

const ARRANGEMENT_NAME = "arrangement";
const BIBLE_ID = "bible-id";
const TESTAMENT_ID = "testament-id";
const SECTION_ID = "section-id";
const UNHIGHLIGHT_DELAY = 250;

const sectionPiece: Piece<"StackSection"> = {
  id: "section-piece",
  type: "StackSection",
};

const sectionInfo: SectionInfo = {
  name: "section",
  color: "#ffffff",
  books: [],
  path: {
    arrangementName: ARRANGEMENT_NAME,
    testamentIndex: 0,
    sectionIndex: 0,
  },
};

const applyHighlightState = (data: StackSectionData, state: HighlightState) => {
  if (state === HighlightStates.Idle) return;

  data.changeHighlightState(HighlightEvents.RequestHighlight);

  if (state === HighlightStates.Highlighting) return;

  data.changeHighlightState(HighlightEvents.SequenceComplete);

  if (state === HighlightStates.Unhighlighting) {
    data.changeHighlightState(HighlightEvents.RequestUnhighlight);
  }
};

const makeSectionData = ({
  highlightState = HighlightStates.Idle,
  isSplitIntoBooks = false,
  isFocused = false,
}: {
  highlightState?: HighlightState;
  isSplitIntoBooks?: boolean;
  isFocused?: boolean;
} = {}): StackSectionData => {
  const sectionData = new StackSectionData({
    id: SECTION_ID,
    piece: sectionPiece,
    pieceInfo: sectionInfo,
    parentDataIds: { stackBibleId: BIBLE_ID, stackTestamentId: TESTAMENT_ID },
    isSplitIntoBooks,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

  applyHighlightState(sectionData, highlightState);
  if (isFocused) {
    sectionData.beginFocus();
  }

  return sectionData;
};

const makeBibleData = ({
  currentState = BibleStates.Open,
}: {
  currentState?: BibleState;
} = {}): StackBibleData => {
  const bibleData = new StackBibleData({
    id: BIBLE_ID,
    childrenData: [],
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 0,
    bibleType: BibleTypes.Default,
  });
  bibleData.changeState(currentState);
  return bibleData;
};

const makeParentDataChain = (
  overrides: Partial<ParentDataChain> = {}
): ParentDataChain => ({
  bibleData: undefined,
  testamentData: undefined,
  sectionData: undefined,
  sectionBookData: undefined,
  bookData: undefined,
  ...overrides,
});

describe("pattern.bible-stack.application.services.SectionInteractionService", () => {
  let service: SectionInteractionService;
  let sectionDataRepositoryPort: Mocked<
    Pick<PieceDataRepositoryPort, "getPieceData">
  >;
  let pieceHierarchyServicePort: Mocked<PieceHierarchyServicePort>;
  let tourGuideServicePort: Mocked<TourGuideServicePort>;
  let pieceHighlightServicePort: Mocked<PieceHighlighterPort>;
  let sectionInteractionConfigProviderPort: Mocked<SectionInteractionConfigProviderPort>;
  let sequenceStateServicePort: Mocked<SequenceStateServicePort>;
  let sectionSelectionServicePort: Mocked<SectionSelectionServicePort>;
  let paintPort: Mocked<PaintPort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    sectionDataRepositoryPort = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<Pick<PieceDataRepositoryPort, "getPieceData">>;

    pieceHierarchyServicePort = {
      getParentDataChain: vi.fn(() => makeParentDataChain()),
    };

    tourGuideServicePort = {
      ongoingTourGuideSectionData:
        undefined as unknown as TourGuideServicePort["ongoingTourGuideSectionData"],
      isThereAnOngoingTourGuide: vi.fn(() => false),
      beginTourGuide: vi.fn(),
      stopTourGuide: vi.fn(),
    };

    pieceHighlightServicePort = {
      tryHighlightPiece: vi.fn(),
      tryUnhighlightPiece: vi.fn(),
      isUnhighlightScheduled: vi.fn(() => false),
      changeHighlightIntensity: vi.fn(),
      clearScheduledUnhighlights: vi.fn(),
      clearHighlightedPieces: vi.fn(),
      forgetPiece: vi.fn(),
      unhighlightBiblePieces: vi.fn(),
    };

    sectionInteractionConfigProviderPort = {
      getDelay: vi.fn(() => UNHIGHLIGHT_DELAY),
    };

    sequenceStateServicePort = {
      isThereAnOngoingSequence: vi.fn(() => false),
      executeAsSequence: vi.fn(async (task: () => Promise<void>) => {
        await task();
      }),
    };

    sectionSelectionServicePort = {
      select: vi.fn(async () => {}),
      deselect: vi.fn(async () => {}),
    };

    paintPort = {
      changeColor: vi.fn(),
      paint: vi.fn(),
      unpaint: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      isActive: false,
    } as unknown as Mocked<PaintPort>;

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new SectionInteractionService({
      sectionDataRepositoryPort,
      pieceHierarchyServicePort,
      tourGuideServicePort,
      pieceHighlightServicePort,
      sectionInteractionConfigProviderPort,
      sequenceStateServicePort,
      sectionSelectionServicePort,
      paintPort,
      loggerPort,
    });
  });

  describe("handleSectionSelection", () => {
    it("logs an error and no-ops if no data found", () => {
      sectionDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handleSectionSelection({
        section: sectionPiece,
        interaction: SelectionModalities.Precise,
      });

      expect(loggerPort.error).toHaveBeenCalledWith(
        "SectionInteractionService: sectionData not found at meetsBaseInteractionConditions"
      );
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("no-ops if section is within a closed bible", () => {
      const sectionData = makeSectionData();
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({
          bibleData: makeBibleData({ currentState: BibleStates.Closed }),
        })
      );
      paintPort.isActive = true;

      service.handleSectionSelection({
        section: sectionPiece,
        interaction: SelectionModalities.Coarse,
      });

      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("no-ops if there's an ongoing tour guide", () => {
      const sectionData = makeSectionData();
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({ bibleData: makeBibleData() })
      );
      tourGuideServicePort.isThereAnOngoingTourGuide.mockReturnValue(true);
      paintPort.isActive = true;

      service.handleSectionSelection({
        section: sectionPiece,
        interaction: SelectionModalities.Coarse,
      });

      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("no-ops if section is highlighting or unhighlighting", () => {
      for (const highlightState of [
        HighlightStates.Highlighting,
        HighlightStates.Unhighlighting,
      ]) {
        vi.clearAllMocks();

        const sectionData = makeSectionData({ highlightState });
        sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);
        paintPort.isActive = true;

        service.handleSectionSelection({
          section: sectionPiece,
          interaction: SelectionModalities.Coarse,
        });

        expect(sectionData.highlightState).toBe(highlightState);
        expect(paintPort.paint).not.toHaveBeenCalled();
        expect(
          sequenceStateServicePort.executeAsSequence
        ).not.toHaveBeenCalled();
        expect(
          pieceHighlightServicePort.tryHighlightPiece
        ).not.toHaveBeenCalled();
      }
    });

    it("paints the section if the paint feature is active", () => {
      const sectionData = makeSectionData({
        highlightState: HighlightStates.Highlighted,
      });
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);
      paintPort.isActive = true;

      service.handleSectionSelection({
        section: sectionPiece,
        interaction: SelectionModalities.Coarse,
      });

      expect(paintPort.paint).toHaveBeenCalledWith(sectionData);
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(sectionSelectionServicePort.select).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("executes a selection as a sequence if the section is not selected, is highlighted, the selection modality is precise and paint feature is not active", () => {
      const sectionData = makeSectionData({
        highlightState: HighlightStates.Highlighted,
        isSplitIntoBooks: false,
      });
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);

      service.handleSectionSelection({
        section: sectionPiece,
        interaction: SelectionModalities.Precise,
      });

      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledOnce();
      expect(sectionSelectionServicePort.select).toHaveBeenCalledWith({
        data: sectionData,
        source: PieceSelectionSources.UserSelection,
      });
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("tries to highlight the piece if it is not highlighted, the selection modality is precise and paint feature is not active", () => {
      const sectionData = makeSectionData({
        highlightState: HighlightStates.Idle,
      });
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);

      service.handleSectionSelection({
        section: sectionPiece,
        interaction: SelectionModalities.Precise,
      });

      expect(pieceHighlightServicePort.tryHighlightPiece).toHaveBeenCalledWith({
        piece: sectionPiece,
        source: HighlightRequestSources.UserSelection,
      });
      expect(sequenceStateServicePort.executeAsSequence).not.toHaveBeenCalled();
      expect(sectionSelectionServicePort.select).not.toHaveBeenCalled();
      expect(paintPort.paint).not.toHaveBeenCalled();
    });

    it("executes a selection as a sequence if selection modality is coarse, and paint feature is not active", () => {
      const sectionData = makeSectionData({
        highlightState: HighlightStates.Idle,
      });
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);

      service.handleSectionSelection({
        section: sectionPiece,
        interaction: SelectionModalities.Coarse,
      });

      expect(sequenceStateServicePort.executeAsSequence).toHaveBeenCalledOnce();
      expect(sectionSelectionServicePort.select).toHaveBeenCalledWith({
        data: sectionData,
        source: PieceSelectionSources.UserSelection,
      });
      expect(paintPort.paint).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });
  });

  describe("handleSectionFocusBegin", () => {
    it("logs an error and no-ops if no data found", () => {
      sectionDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handleSectionFocusBegin(sectionPiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "SectionInteractionService: sectionData not found at handleSectionFocusBegin"
      );
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("focuses the section if data found", () => {
      const sectionData = makeSectionData();
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);

      expect(sectionData.isFocused).toBe(false);

      service.handleSectionFocusBegin(sectionPiece);

      expect(sectionData.isFocused).toBe(true);
    });

    it("no-ops if section is within a closed bible, after focusing it", () => {
      const sectionData = makeSectionData();
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({
          bibleData: makeBibleData({ currentState: BibleStates.Closed }),
        })
      );

      service.handleSectionFocusBegin(sectionPiece);

      expect(sectionData.isFocused).toBe(true);
      expect(
        pieceHighlightServicePort.tryHighlightPiece
      ).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("tries to highlight the section with UserFocus as source", () => {
      const sectionData = makeSectionData();
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({ bibleData: makeBibleData() })
      );

      service.handleSectionFocusBegin(sectionPiece);

      expect(pieceHighlightServicePort.tryHighlightPiece).toHaveBeenCalledWith({
        piece: sectionPiece,
        source: HighlightRequestSources.UserFocus,
      });
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });

  describe("handleSectionFocusEnd", () => {
    it("logs an error and no-ops if no data found", () => {
      sectionDataRepositoryPort.getPieceData.mockReturnValue(undefined);

      service.handleSectionFocusEnd(sectionPiece);

      expect(loggerPort.error).toHaveBeenCalledWith(
        "SectionInteractionService: sectionData not found at handleSectionFocusEnd"
      );
      expect(
        pieceHierarchyServicePort.getParentDataChain
      ).not.toHaveBeenCalled();
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).not.toHaveBeenCalled();
    });

    it("unfocuses the section if data found", () => {
      const sectionData = makeSectionData({ isFocused: true });
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);

      expect(sectionData.isFocused).toBe(true);

      service.handleSectionFocusEnd(sectionPiece);

      expect(sectionData.isFocused).toBe(false);
    });

    it("no-ops if section is within a closed bible, after unfocusing it", () => {
      const sectionData = makeSectionData({ isFocused: true });
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({
          bibleData: makeBibleData({ currentState: BibleStates.Closed }),
        })
      );

      service.handleSectionFocusEnd(sectionPiece);

      expect(sectionData.isFocused).toBe(false);
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("no-ops if section is selected, after unfocusing it", () => {
      const sectionData = makeSectionData({
        isFocused: true,
        isSplitIntoBooks: true,
      });
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);

      service.handleSectionFocusEnd(sectionPiece);

      expect(sectionData.isFocused).toBe(false);
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).not.toHaveBeenCalled();
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("tries to unhighlight the section with UserUnfocus as source, Regular as pacing and provided unhighlight section delay", () => {
      const sectionData = makeSectionData({ isFocused: true });
      sectionDataRepositoryPort.getPieceData.mockReturnValue(sectionData);
      pieceHierarchyServicePort.getParentDataChain.mockReturnValue(
        makeParentDataChain({ bibleData: makeBibleData() })
      );

      service.handleSectionFocusEnd(sectionPiece);

      expect(
        sectionInteractionConfigProviderPort.getDelay
      ).toHaveBeenCalledWith(SectionInteractionDelays.UnhighlightSection);
      expect(
        pieceHighlightServicePort.tryUnhighlightPiece
      ).toHaveBeenCalledWith({
        piece: sectionPiece,
        source: UnhighlightRequestSources.UserUnfocus,
        pacing: HighlightPacings.Regular,
        delay: UNHIGHLIGHT_DELAY,
      });
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });
});
