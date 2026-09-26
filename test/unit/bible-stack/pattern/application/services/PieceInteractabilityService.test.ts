import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PieceInteractabilityService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceInteractabilityService";
import type { ScripturePiecesStateServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/ScripturePiecesState";
import type {
  BibleDataRepositoryPort,
  PieceAdapterPort,
  PieceDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceInteractability";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type { StackPieceDataMap } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieces";
import { StackBibleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBibleData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type {
  CompleteBookInfo,
  SectionInfo,
  TestamentInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import {
  BibleTypes,
  BibleVisualizationStates,
  CrossPositions,
  type BiblePiece,
  type BibleType,
  type Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import { SelectionEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";

type AnyPieceData = StackPieceDataMap[keyof StackPieceDataMap];

interface DataOptions {
  isActive?: boolean;
  isBeingDragged?: boolean;
  isSelected?: boolean;
  withoutPiece?: boolean;
}

const bookInfo: CompleteBookInfo = {
  type: "complete",
  bookId: "GEN",
  author: "author",
  chaptersVerseCount: [10],
  relativeDateRange: { min: 0, max: 1 },
  numberOfChapters: 1,
  path: {
    arrangementName: "arrangement",
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex: 0,
  },
};

const sectionInfo: SectionInfo = {
  name: "section",
  color: "#ffffff",
  books: [bookInfo],
  path: {
    arrangementName: "arrangement",
    testamentIndex: 0,
    sectionIndex: 0,
  },
};

const testamentInfo: TestamentInfo = {
  name: "testament",
  sections: [sectionInfo],
};

const TESTAMENT_WITHOUT_PIECE_ERROR =
  "PieceInteractabilityService: testamentData.piece not defined at setTestamentsInteractable";
const SECTION_WITHOUT_PIECE_ERROR =
  "PieceInteractabilityService: sectionData.piece not defined at setTestamentsInteractable";
const BOOK_WITHOUT_PIECE_ERROR =
  "PieceInteractabilityService: bookData.piece not defined at setTestamentsInteractable";

const sorted = (ids: string[]) => [...ids].sort();

const applyOptions = (
  data: AnyPieceData,
  { isBeingDragged = false, isSelected = false }: DataOptions
) => {
  if (isBeingDragged) {
    data.beginDrag();
  }
  if (isSelected) {
    data.changeSelectionState(SelectionEvents.RequestSelect);
    data.changeSelectionState(SelectionEvents.SequenceComplete);
  }
};

const makeBibleData = (
  id: string,
  bibleType: BibleType,
  childrenData: StackTestamentData[]
) =>
  new StackBibleData({
    id,
    currentCrossPosition: CrossPositions.Top,
    currentStackVizState: BibleVisualizationStates.Regular,
    arrangementIndex: 0,
    bibleType,
    childrenData,
  });

describe("pattern.bible-stack.application.services.PieceInteractabilityService", () => {
  let service: PieceInteractabilityService;
  let bibleDataRepositoryPort: Mocked<BibleDataRepositoryPort>;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;
  let pieceAdapterPort: Mocked<PieceAdapterPort>;
  let scripturePiecesStateServicePort: Mocked<ScripturePiecesStateServicePort>;
  let loggerPort: Mocked<LoggerPort>;
  let arePiecesDraggable: boolean;
  let dataByPieceId: Map<string, AnyPieceData>;

  const register = <T extends AnyPieceData>(data: T): T => {
    if (data.piece) {
      dataByPieceId.set(data.piece.id, data);
    }
    return data;
  };

  const makeTestamentData = (
    id: string,
    {
      isSplitIntoSections = false,
      childrenData = [],
      pieceType = "StackTestament",
      ...options
    }: DataOptions & {
      isSplitIntoSections?: boolean;
      childrenData?: (StackSectionData | StackSectionBookData)[];
      pieceType?: BiblePiece;
    } = {}
  ) => {
    const data = new StackTestamentData({
      id: `${id}-data`,
      piece: options.withoutPiece
        ? undefined
        : ({ id, type: pieceType } as Piece<"StackTestament">),
      pieceInfo: testamentInfo,
      parentDataIds: {},
      isSplitIntoSections,
      isActive: options.isActive ?? true,
      creationParams: { arrangementIndex: 0, testamentIndex: 0 },
      childrenData,
    });
    applyOptions(data, options);
    return register(data);
  };

  const makeSectionData = (
    id: string,
    {
      isSplitIntoBooks = false,
      childrenData = [],
      ...options
    }: DataOptions & {
      isSplitIntoBooks?: boolean;
      childrenData?: StackBookData[][];
    } = {}
  ) => {
    const data = new StackSectionData({
      id: `${id}-data`,
      piece: options.withoutPiece ? undefined : { id, type: "StackSection" },
      pieceInfo: sectionInfo,
      parentDataIds: {},
      isSplitIntoBooks,
      isActive: options.isActive ?? true,
      creationParams: {
        arrangementIndex: 0,
        testamentIndex: 0,
        sectionIndex: 0,
        amountOfChaptersInSection: 1,
      },
      childrenData,
    });
    applyOptions(data, options);
    return register(data);
  };

  const makeSectionBookData = (id: string, options: DataOptions = {}) => {
    const data = new StackSectionBookData({
      id: `${id}-data`,
      piece: options.withoutPiece
        ? undefined
        : { id, type: "StackSectionBook" },
      pieceInfo: sectionInfo,
      pieceBookInfo: bookInfo,
      parentDataIds: {},
      isActive: options.isActive ?? true,
      creationParams: {
        arrangementIndex: 0,
        testamentIndex: 0,
        sectionIndex: 0,
        amountOfChaptersInSection: 1,
      },
    });
    applyOptions(data, options);
    return register(data);
  };

  const makeBookData = (id: string, options: DataOptions = {}) => {
    const data = new StackBookData({
      id: `${id}-data`,
      piece: options.withoutPiece ? undefined : { id, type: "StackBook" },
      pieceInfo: bookInfo,
      parentDataIds: {},
      isActive: options.isActive ?? true,
      creationParams: {
        arrangementIndex: 0,
        testamentIndex: 0,
        sectionIndex: 0,
        levelIndex: 0,
        bookIndex: 0,
        bookLevelIndex: 0,
        levelsLenght: 1,
      },
    });
    applyOptions(data, options);
    return register(data);
  };

  const makeHierarchy = (prefix: string) => {
    const book = makeBookData(`${prefix}-book`);
    const splitSection = makeSectionData(`${prefix}-split-section`, {
      isSplitIntoBooks: true,
      childrenData: [[book]],
    });
    const section = makeSectionData(`${prefix}-section`);
    const sectionBook = makeSectionBookData(`${prefix}-section-book`);
    const splitTestament = makeTestamentData(`${prefix}-split-testament`, {
      isSplitIntoSections: true,
      childrenData: [section, sectionBook, splitSection],
    });
    const testament = makeTestamentData(`${prefix}-testament`);

    return {
      testaments: [splitTestament, testament],
      eligible: [testament, section, sectionBook, book],
      skipped: [splitTestament, splitSection],
    };
  };

  const pieceIdsOf = (datas: AnyPieceData[]) =>
    datas.map((data) => data.piece!.id);

  const calledPieceIds = (
    fn: Mocked<PieceAdapterPort>[keyof PieceAdapterPort]
  ) => fn.mock.calls.map(([piece]) => piece.id);

  const touchedPieceIds = () =>
    sorted([
      ...new Set([
        ...calledPieceIds(pieceAdapterPort.anchorPiece),
        ...calledPieceIds(pieceAdapterPort.unanchorPiece),
        ...calledPieceIds(pieceAdapterPort.makeInteractable),
        ...calledPieceIds(pieceAdapterPort.makeNonInteractable),
      ]),
    ]);

  const makeAllHighlightable = (datas: AnyPieceData[]) => {
    datas.forEach((data) => data.becomeHighlightable());
  };

  beforeEach(() => {
    arePiecesDraggable = true;
    dataByPieceId = new Map();

    bibleDataRepositoryPort = {
      getAllBiblesData: vi.fn(),
    };

    pieceDataRepositoryPort = {
      getStandaloneTestaments: vi.fn(),
      getPieceData: vi.fn(),
    } as unknown as Mocked<PieceDataRepositoryPort>;

    pieceAdapterPort = {
      anchorPiece: vi.fn(),
      unanchorPiece: vi.fn(),
      makeInteractable: vi.fn(),
      makeNonInteractable: vi.fn(),
    };

    scripturePiecesStateServicePort = {
      get arePiecesDraggable() {
        return arePiecesDraggable;
      },
      shouldShowLabelDates:
        undefined as unknown as ScripturePiecesStateServicePort["shouldShowLabelDates"],
      resetToDefault: vi.fn(),
      makePiecesDraggable: vi.fn(),
      makePiecesNotDraggable: vi.fn(),
      enableLabelDates: vi.fn(),
      disableLabelDates: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    bibleDataRepositoryPort.getAllBiblesData.mockReturnValue([]);
    pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([]);
    pieceDataRepositoryPort.getPieceData.mockImplementation(((piece: Piece) =>
      dataByPieceId.get(piece.id)) as PieceDataRepositoryPort["getPieceData"]);

    service = new PieceInteractabilityService({
      bibleDataRepositoryPort,
      pieceDataRepositoryPort,
      pieceAdapterPort,
      scripturePiecesStateServicePort,
      loggerPort,
    });
  });

  describe("blockAll", () => {
    it("successfully sets all non-platformer-game bibles and testaments that matches the criteria not interactable", () => {
      const defaultTestament = makeTestamentData("default-testament");
      const platformerTestament = makeTestamentData("platformer-testament");
      const standaloneTestament = makeTestamentData("standalone-testament");
      const inactiveTestament = makeTestamentData("inactive-testament", {
        isActive: false,
      });
      const all = [
        defaultTestament,
        platformerTestament,
        standaloneTestament,
        inactiveTestament,
      ];
      makeAllHighlightable(all);
      bibleDataRepositoryPort.getAllBiblesData.mockReturnValue([
        makeBibleData("default-bible", BibleTypes.Default, [
          defaultTestament,
          inactiveTestament,
        ]),
        makeBibleData("platformer-bible", BibleTypes.PlatformerGame, [
          platformerTestament,
        ]),
      ]);
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        standaloneTestament,
      ]);

      service.blockAll();

      const blocked = pieceIdsOf([
        defaultTestament,
        platformerTestament,
        standaloneTestament,
      ]);
      expect(
        sorted(calledPieceIds(pieceAdapterPort.makeNonInteractable))
      ).toEqual(sorted(blocked));
      expect(sorted(calledPieceIds(pieceAdapterPort.anchorPiece))).toEqual(
        sorted(blocked)
      );
      expect(pieceAdapterPort.makeInteractable).not.toHaveBeenCalled();
      expect(pieceAdapterPort.unanchorPiece).not.toHaveBeenCalled();
      expect(defaultTestament.isHighlightable).toBe(false);
      expect(platformerTestament.isHighlightable).toBe(false);
      expect(standaloneTestament.isHighlightable).toBe(false);
      expect(inactiveTestament.isHighlightable).toBe(true);
    });
  });

  describe("unlockAll", () => {
    it("successfully sets all non-platformer-game bibles and testaments that matches the criteria interactable", () => {
      const defaultTestament = makeTestamentData("default-testament");
      const platformerTestament = makeTestamentData("platformer-testament");
      const standaloneTestament = makeTestamentData("standalone-testament");
      const inactiveTestament = makeTestamentData("inactive-testament", {
        isActive: false,
      });
      bibleDataRepositoryPort.getAllBiblesData.mockReturnValue([
        makeBibleData("default-bible", BibleTypes.Default, [
          defaultTestament,
          inactiveTestament,
        ]),
        makeBibleData("platformer-bible", BibleTypes.PlatformerGame, [
          platformerTestament,
        ]),
      ]);
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        standaloneTestament,
      ]);

      service.unlockAll();

      const unlocked = pieceIdsOf([defaultTestament, standaloneTestament]);
      expect(sorted(calledPieceIds(pieceAdapterPort.makeInteractable))).toEqual(
        sorted(unlocked)
      );
      expect(sorted(calledPieceIds(pieceAdapterPort.unanchorPiece))).toEqual(
        sorted(unlocked)
      );
      expect(calledPieceIds(pieceAdapterPort.makeNonInteractable)).toEqual(
        pieceIdsOf([platformerTestament])
      );
      expect(calledPieceIds(pieceAdapterPort.anchorPiece)).toEqual(
        pieceIdsOf([platformerTestament])
      );
      expect(defaultTestament.isHighlightable).toBe(true);
      expect(standaloneTestament.isHighlightable).toBe(true);
      expect(platformerTestament.isHighlightable).toBe(false);
      expect(inactiveTestament.isHighlightable).toBe(false);
    });
  });

  describe("pieces interactability", () => {
    it("successfully sets all non-platformer-game bibles' found children's hierarchy to the target interactability", () => {
      const firstHierarchy = makeHierarchy("first");
      const secondHierarchy = makeHierarchy("second");
      const platformerHierarchy = makeHierarchy("platformer");
      bibleDataRepositoryPort.getAllBiblesData.mockReturnValue([
        makeBibleData(
          "first-bible",
          BibleTypes.Default,
          firstHierarchy.testaments
        ),
        makeBibleData(
          "second-bible",
          BibleTypes.Default,
          secondHierarchy.testaments
        ),
        makeBibleData(
          "platformer-bible",
          BibleTypes.PlatformerGame,
          platformerHierarchy.testaments
        ),
      ]);
      const eligible = [
        ...firstHierarchy.eligible,
        ...secondHierarchy.eligible,
      ];
      const skipped = [
        ...firstHierarchy.skipped,
        ...secondHierarchy.skipped,
        ...platformerHierarchy.skipped,
      ];

      service.unlockAll();

      expect(sorted(calledPieceIds(pieceAdapterPort.makeInteractable))).toEqual(
        sorted(pieceIdsOf(eligible))
      );
      expect(sorted(calledPieceIds(pieceAdapterPort.unanchorPiece))).toEqual(
        sorted(pieceIdsOf(eligible))
      );
      expect(
        sorted(calledPieceIds(pieceAdapterPort.makeNonInteractable))
      ).toEqual(sorted(pieceIdsOf(platformerHierarchy.eligible)));
      eligible.forEach((data) => expect(data.isHighlightable).toBe(true));
      platformerHierarchy.eligible.forEach((data) =>
        expect(data.isHighlightable).toBe(false)
      );
      skipped.forEach((data) => {
        expect(touchedPieceIds()).not.toContain(data.piece!.id);
        expect(data.isHighlightable).toBe(false);
      });

      vi.clearAllMocks();
      makeAllHighlightable([...eligible, ...skipped]);

      service.blockAll();

      expect(
        sorted(calledPieceIds(pieceAdapterPort.makeNonInteractable))
      ).toEqual(
        sorted(pieceIdsOf([...eligible, ...platformerHierarchy.eligible]))
      );
      expect(pieceAdapterPort.makeInteractable).not.toHaveBeenCalled();
      eligible.forEach((data) => expect(data.isHighlightable).toBe(false));
      skipped.forEach((data) => {
        expect(touchedPieceIds()).not.toContain(data.piece!.id);
        expect(data.isHighlightable).toBe(true);
      });
    });

    it("successfully sets all standalone testaments found hierarchy to the target interactability", () => {
      const firstHierarchy = makeHierarchy("first");
      const secondHierarchy = makeHierarchy("second");
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        ...firstHierarchy.testaments,
        ...secondHierarchy.testaments,
      ]);
      const eligible = [
        ...firstHierarchy.eligible,
        ...secondHierarchy.eligible,
      ];
      const skipped = [...firstHierarchy.skipped, ...secondHierarchy.skipped];

      service.unlockAll();

      expect(sorted(calledPieceIds(pieceAdapterPort.makeInteractable))).toEqual(
        sorted(pieceIdsOf(eligible))
      );
      expect(pieceAdapterPort.makeNonInteractable).not.toHaveBeenCalled();
      eligible.forEach((data) => expect(data.isHighlightable).toBe(true));
      skipped.forEach((data) => {
        expect(touchedPieceIds()).not.toContain(data.piece!.id);
        expect(data.isHighlightable).toBe(false);
      });

      vi.clearAllMocks();
      makeAllHighlightable([...eligible, ...skipped]);

      service.blockAll();

      expect(
        sorted(calledPieceIds(pieceAdapterPort.makeNonInteractable))
      ).toEqual(sorted(pieceIdsOf(eligible)));
      expect(pieceAdapterPort.makeInteractable).not.toHaveBeenCalled();
      eligible.forEach((data) => expect(data.isHighlightable).toBe(false));
      skipped.forEach((data) => {
        expect(touchedPieceIds()).not.toContain(data.piece!.id);
        expect(data.isHighlightable).toBe(true);
      });
    });

    it("only sets the testament's interactability if it is active, not being dragged, not selected and has a piece", () => {
      const eligible = makeTestamentData("eligible");
      const inactive = makeTestamentData("inactive", { isActive: false });
      const dragged = makeTestamentData("dragged", { isBeingDragged: true });
      const selected = makeTestamentData("selected", {
        isSplitIntoSections: true,
      });
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        eligible,
        inactive,
        dragged,
        selected,
      ]);

      service.unlockAll();

      expect(touchedPieceIds()).toEqual(pieceIdsOf([eligible]));
      expect(pieceAdapterPort.makeInteractable).toHaveBeenCalledExactlyOnceWith(
        eligible.piece
      );
      expect(eligible.isHighlightable).toBe(true);
      expect(inactive.isHighlightable).toBe(false);
      expect(dragged.isHighlightable).toBe(false);
      expect(selected.isHighlightable).toBe(false);
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("logs an error and omits the testament if it has no piece attached", () => {
      const withoutPiece = makeTestamentData("without-piece", {
        withoutPiece: true,
      });
      const withPiece = makeTestamentData("with-piece");
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        withoutPiece,
        withPiece,
      ]);

      expect(() => service.unlockAll()).not.toThrow();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        TESTAMENT_WITHOUT_PIECE_ERROR
      );
      expect(touchedPieceIds()).toEqual(pieceIdsOf([withPiece]));
      expect(withoutPiece.isHighlightable).toBe(false);
      expect(withPiece.isHighlightable).toBe(true);
    });

    it("only sets the section interactability if it is not a section book, is active, not being dragged, not selected and has a piece", () => {
      const eligibleSection = makeSectionData("eligible-section");
      const eligibleSectionBook = makeSectionBookData("eligible-section-book");
      const inactiveSection = makeSectionData("inactive-section", {
        isActive: false,
      });
      const draggedSection = makeSectionData("dragged-section", {
        isBeingDragged: true,
      });
      const selectedSection = makeSectionData("selected-section", {
        isSplitIntoBooks: true,
      });
      const inactiveSectionBook = makeSectionBookData("inactive-section-book", {
        isActive: false,
      });
      const draggedSectionBook = makeSectionBookData("dragged-section-book", {
        isBeingDragged: true,
      });
      const selectedSectionBook = makeSectionBookData("selected-section-book", {
        isSelected: true,
      });
      const skipped = [
        inactiveSection,
        draggedSection,
        selectedSection,
        inactiveSectionBook,
        draggedSectionBook,
        selectedSectionBook,
      ];
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        makeTestamentData("testament", {
          isSplitIntoSections: true,
          childrenData: [eligibleSection, eligibleSectionBook, ...skipped],
        }),
      ]);

      service.unlockAll();

      expect(touchedPieceIds()).toEqual(
        sorted(pieceIdsOf([eligibleSection, eligibleSectionBook]))
      );
      expect(eligibleSection.isHighlightable).toBe(true);
      expect(eligibleSectionBook.isHighlightable).toBe(true);
      skipped.forEach((data) => expect(data.isHighlightable).toBe(false));
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("logs an error and omits the section if it has no piece attached", () => {
      const withoutPiece = makeSectionData("without-piece", {
        withoutPiece: true,
      });
      const withPiece = makeSectionData("with-piece");
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        makeTestamentData("testament", {
          isSplitIntoSections: true,
          childrenData: [withoutPiece, withPiece],
        }),
      ]);

      expect(() => service.unlockAll()).not.toThrow();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        SECTION_WITHOUT_PIECE_ERROR
      );
      expect(touchedPieceIds()).toEqual(pieceIdsOf([withPiece]));
      expect(withoutPiece.isHighlightable).toBe(false);
      expect(withPiece.isHighlightable).toBe(true);
    });

    it("only sets the book interactability if it is active, not being dragged, not selected and has a piece", () => {
      const eligible = makeBookData("eligible");
      const inactive = makeBookData("inactive", { isActive: false });
      const dragged = makeBookData("dragged", { isBeingDragged: true });
      const selected = makeBookData("selected", { isSelected: true });
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        makeTestamentData("testament", {
          isSplitIntoSections: true,
          childrenData: [
            makeSectionData("section", {
              isSplitIntoBooks: true,
              childrenData: [
                [eligible, inactive],
                [dragged, selected],
              ],
            }),
          ],
        }),
      ]);

      service.unlockAll();

      expect(touchedPieceIds()).toEqual(pieceIdsOf([eligible]));
      expect(eligible.isHighlightable).toBe(true);
      expect(inactive.isHighlightable).toBe(false);
      expect(dragged.isHighlightable).toBe(false);
      expect(selected.isHighlightable).toBe(false);
      expect(loggerPort.error).not.toHaveBeenCalled();
    });

    it("logs an error and omits the book if it has no piece attached", () => {
      const withoutPiece = makeBookData("without-piece", {
        withoutPiece: true,
      });
      const withPiece = makeBookData("with-piece");
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        makeTestamentData("testament", {
          isSplitIntoSections: true,
          childrenData: [
            makeSectionData("section", {
              isSplitIntoBooks: true,
              childrenData: [[withoutPiece, withPiece]],
            }),
          ],
        }),
      ]);

      expect(() => service.unlockAll()).not.toThrow();

      expect(loggerPort.error).toHaveBeenCalledExactlyOnceWith(
        BOOK_WITHOUT_PIECE_ERROR
      );
      expect(touchedPieceIds()).toEqual(pieceIdsOf([withPiece]));
      expect(withoutPiece.isHighlightable).toBe(false);
      expect(withPiece.isHighlightable).toBe(true);
    });

    it("uses the piece draggable state from the piece state service port to override the provided value for the piece draggability", () => {
      const testament = makeTestamentData("testament");
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        testament,
      ]);
      const cases = [
        {
          draggable: true,
          apply: () => service.unlockAll(),
          anchored: false,
          interactable: true,
        },
        {
          draggable: true,
          apply: () => service.blockAll(),
          anchored: true,
          interactable: false,
        },
        {
          draggable: false,
          apply: () => service.unlockAll(),
          anchored: true,
          interactable: true,
        },
        {
          draggable: false,
          apply: () => service.blockAll(),
          anchored: true,
          interactable: false,
        },
      ];

      cases.forEach(({ draggable, apply, anchored, interactable }) => {
        vi.clearAllMocks();
        arePiecesDraggable = draggable;

        apply();

        expect(pieceAdapterPort.anchorPiece).toHaveBeenCalledTimes(
          anchored ? 1 : 0
        );
        expect(pieceAdapterPort.unanchorPiece).toHaveBeenCalledTimes(
          anchored ? 0 : 1
        );
        expect(pieceAdapterPort.makeInteractable).toHaveBeenCalledTimes(
          interactable ? 1 : 0
        );
        expect(pieceAdapterPort.makeNonInteractable).toHaveBeenCalledTimes(
          interactable ? 0 : 1
        );
        expect(testament.isHighlightable).toBe(interactable);
      });
    });

    it("mutates the piece highlightability only for StackTestament, StackSection, StackSectionBook, StackBook and StackChapter", () => {
      const highlightableTypes: BiblePiece[] = [
        "StackTestament",
        "StackSection",
        "StackSectionBook",
        "StackBook",
        "StackChapter",
      ];
      const otherTypes: BiblePiece[] = [
        "StackSectionShadow",
        "VersesBundle",
        "Verse",
        "StackCover",
        "InfoLabelTransformer",
      ];
      const highlightable = highlightableTypes.map((pieceType) =>
        makeTestamentData(pieceType, { pieceType })
      );
      const others = otherTypes.map((pieceType) =>
        makeTestamentData(pieceType, { pieceType })
      );
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        ...highlightable,
        ...others,
      ]);

      service.unlockAll();

      highlightable.forEach((data) => expect(data.isHighlightable).toBe(true));
      others.forEach((data) => expect(data.isHighlightable).toBe(false));

      makeAllHighlightable(others);

      service.blockAll();

      highlightable.forEach((data) => expect(data.isHighlightable).toBe(false));
      others.forEach((data) => expect(data.isHighlightable).toBe(true));
    });

    it("omits the highlightability change if no data found", () => {
      const withoutData = makeTestamentData("without-data");
      const withData = makeTestamentData("with-data");
      dataByPieceId.delete(withoutData.piece!.id);
      pieceDataRepositoryPort.getStandaloneTestaments.mockReturnValue([
        withoutData,
        withData,
      ]);

      expect(() => service.unlockAll()).not.toThrow();

      expect(sorted(calledPieceIds(pieceAdapterPort.makeInteractable))).toEqual(
        sorted(pieceIdsOf([withoutData, withData]))
      );
      expect(withoutData.isHighlightable).toBe(false);
      expect(withData.isHighlightable).toBe(true);
      expect(loggerPort.error).not.toHaveBeenCalled();

      makeAllHighlightable([withoutData, withData]);

      expect(() => service.blockAll()).not.toThrow();

      expect(withoutData.isHighlightable).toBe(true);
      expect(withData.isHighlightable).toBe(false);
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });
});
