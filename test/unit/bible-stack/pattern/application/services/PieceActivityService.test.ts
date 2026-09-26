import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PieceActivityService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceActivityService";
import type { ArrangementServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Arrangement";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Logger";
import type { UserPresencePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/UserPresence";
import type {
  ActivityIndicatorLifecyclePort,
  ActivityIndicatorsAdapterPort,
  ActivityNotificationAdapterPort,
  AnyShowIndicatorCommand,
  DataRegistryPort,
  GetPieceData,
  IdGeneratorPort,
  LabelDataStorePort,
  ShowExtraContentIndicatorCommand,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceActivity";
import type { UserIdentityPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/UserIdentity";
import type { BaseEventManager } from "../../../../../../patterns/bible-stack/bible-stack/application/services/BaseEventManager";
import { ActivityIndicatorData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/ActivityIndicatorData";
import { InfoLabelData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/InfoLabelData";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import type {
  CompleteBookInfo,
  SectionInfo,
  SubsetBookInfo,
  TestamentInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import type {
  ActivityIndicatorType,
  ActivityNotification,
  Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type { BibleStackEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/events";
import { HighlightEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/highlight";
import { LabelPositions } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/label";
import { SelectionEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/selection";
import type {
  ConnectedUserData,
  ReadingInstance,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/userPresence";

const ARRANGEMENT_NAME = "arrangement";
const OWN_CONNECTION_ID = "own-connection";

const makeSectionInfo = (
  name: string,
  testamentIndex: number,
  sectionIndex: number
): SectionInfo => ({
  name,
  color: "#000000",
  books: [],
  path: { arrangementName: ARRANGEMENT_NAME, testamentIndex, sectionIndex },
});

const OLD_TESTAMENT: TestamentInfo = {
  name: "Old Testament",
  sections: [makeSectionInfo("Law", 0, 0), makeSectionInfo("Poetry", 0, 1)],
};

const NEW_TESTAMENT: TestamentInfo = {
  name: "New Testament",
  sections: [makeSectionInfo("Gospels", 1, 0)],
};

const TESTAMENTS: TestamentInfo[] = [OLD_TESTAMENT, NEW_TESTAMENT];

type BookInfoPath = ReturnType<ArrangementServicePort["getBookInfoPathById"]>;

const BOOK_PATHS: Record<string, BookInfoPath> = {
  GEN: {
    found: true,
    arrangementIndex: 0,
    testamentIndex: 0,
    sectionIndex: 0,
    bookIndex: 0,
  },
  "PSA-2": {
    found: true,
    arrangementIndex: 0,
    testamentIndex: 0,
    sectionIndex: 1,
    bookIndex: 0,
  },
  MAT: {
    found: true,
    arrangementIndex: 0,
    testamentIndex: 1,
    sectionIndex: 0,
    bookIndex: 0,
  },
};

const PSALMS_BOOK_TWO: SubsetBookInfo = {
  type: "subset",
  bookId: "PSA-2",
  completeBookId: "PSA",
  startIndex: 41,
  endIndex: 72,
  author: "author",
  chaptersVerseCount: [10],
  relativeDateRange: { min: 0, max: 1 },
  numberOfChapters: 31,
  path: {
    arrangementName: ARRANGEMENT_NAME,
    testamentIndex: 0,
    sectionIndex: 1,
    bookIndex: 0,
  },
};

const makeInstance = ({
  id,
  connectionId,
  bookId = "GEN",
  chapter = 1,
  selected = false,
}: {
  id: string;
  connectionId: string;
  bookId?: string;
  chapter?: number;
  selected?: boolean;
}): ReadingInstance => ({
  id,
  connectionId,
  bookId,
  chapter,
  selected,
  translation: "KJV",
});

const makeIdentity = ({
  connectionId,
  color,
  icon,
  pictureUrl,
}: {
  connectionId: string;
  color: string;
  icon: string;
  pictureUrl?: string;
}): ConnectedUserData => ({
  connectionId,
  profile: { name: connectionId, pictureUrl },
  visual: { color, defaultIcon: icon, colorName: color },
});

const makeIndicator = ({
  id,
  index,
  indicatorType = "regular",
}: {
  id: string;
  index: number;
  indicatorType?: ActivityIndicatorType;
}): ActivityIndicatorData =>
  new ActivityIndicatorData({
    id,
    index,
    indicatorType,
    piece: { id: `${id}-piece`, type: "ActivityIndicator", dataId: id },
    containerPieceId: "chapter-piece",
    containerDataId: "chapter-data",
    containerType: "StackChapter",
  });

const makeNotification = (id: string): ActivityNotification => ({
  id,
  type: "ActivityNotification",
});

const makeChapterData = ({
  id = "chapter-data",
  pieceId = "chapter-piece",
  withPiece = true,
  bookId = "GEN",
  number = 1,
  activityIndicators = [],
  activityNotification,
}: {
  id?: string;
  pieceId?: string;
  withPiece?: boolean;
  bookId?: string;
  number?: number;
  activityIndicators?: ActivityIndicatorData[];
  activityNotification?: ActivityNotification;
} = {}): StackChapterData =>
  new StackChapterData({
    id,
    piece: withPiece ? { id: pieceId, type: "StackChapter" } : undefined,
    pieceInfo: { amountOfVerses: 10, number },
    parentDataIds: {},
    isInsideBible: true,
    creationParams: { bookId },
    activityIndicators,
    activityNotification,
  });

const placeSelectedOnGround = (data: StackChapterData) => {
  data.changeSelectionState(SelectionEvents.RequestSelect);
  data.changeSelectionState(SelectionEvents.SequenceComplete);
  data.placeOnGround();
};

const makeBookData = (bookId: string): StackBookData => {
  const pieceInfo: CompleteBookInfo = {
    type: "complete",
    bookId,
    author: "author",
    chaptersVerseCount: [10],
    relativeDateRange: { min: 0, max: 1 },
    numberOfChapters: 1,
    path: {
      arrangementName: ARRANGEMENT_NAME,
      testamentIndex: 0,
      sectionIndex: 0,
      bookIndex: 0,
    },
  };
  return new StackBookData({
    id: `${bookId}-data`,
    piece: { id: `${bookId}-piece`, type: "StackBook" },
    pieceInfo,
    parentDataIds: {},
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
};

const makeTestamentData = (
  pieceInfo: TestamentInfo,
  testamentIndex: number
): StackTestamentData =>
  new StackTestamentData({
    id: `${pieceInfo.name}-data`,
    piece: { id: `${pieceInfo.name}-piece`, type: "StackTestament" },
    pieceInfo,
    parentDataIds: {},
    creationParams: { arrangementIndex: 0, testamentIndex },
  });

const makeSectionData = (pieceInfo: SectionInfo): StackSectionData =>
  new StackSectionData({
    id: `${pieceInfo.name}-data`,
    piece: { id: `${pieceInfo.name}-piece`, type: "StackSection" },
    pieceInfo,
    parentDataIds: {},
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: pieceInfo.path.testamentIndex,
      sectionIndex: pieceInfo.path.sectionIndex,
      amountOfChaptersInSection: 10,
    },
  });

const makeLabelData = ({
  id = "label-data",
  owner,
  activityIndicators = [],
}: {
  id?: string;
  owner: Piece<"StackBook">;
  activityIndicators?: ActivityIndicatorData[];
}): InfoLabelData =>
  new InfoLabelData({
    id,
    transformer: { id: `${id}-transformer`, type: "InfoLabelTransformer" },
    tail: { id: `${id}-tail`, type: "InfoLabelTail" },
    label: { id: `${id}-text`, type: "InfoLabelText" },
    owner,
    positioning: LabelPositions.Top,
    activityIndicators,
  });

type RegisteredData =
  | StackChapterData
  | StackBookData
  | StackSectionData
  | StackTestamentData;

describe("pattern.bible-stack.application.services.PieceActivityService", () => {
  let service: PieceActivityService;
  let dataRegistryPort: Mocked<DataRegistryPort>;
  let arrangementServicePort: Mocked<ArrangementServicePort>;
  let labelDataStorePort: Mocked<LabelDataStorePort>;
  let userPresenceServicePort: Mocked<UserPresencePort>;
  let activityIndicatorsAdapterPort: Mocked<ActivityIndicatorsAdapterPort>;
  let activityIndicatorLifecyclePort: Mocked<ActivityIndicatorLifecyclePort>;
  let activityNotificationAdapterPort: Mocked<ActivityNotificationAdapterPort>;
  let userIdentityStorePort: Mocked<UserIdentityPort>;
  let idGeneratorPort: Mocked<IdGeneratorPort>;
  let loggerPort: Mocked<LoggerPort>;
  let eventBus: Mocked<BaseEventManager<BibleStackEvents>>;
  let pieceDataById: Map<string, RegisteredData>;

  const createService = (maxIndicators = 0) =>
    new PieceActivityService({
      dataRegistryPort,
      arrangementServicePort,
      labelDataStorePort,
      maxIndicators,
      userPresenceServicePort,
      activityIndicatorsAdapterPort,
      activityIndicatorLifecyclePort,
      activityNotificationAdapterPort,
      userIdentityStorePort,
      idGeneratorPort,
      loggerPort,
      eventBus,
    });

  const register = <T extends RegisteredData>(data: T): T => {
    if (data.piece) {
      pieceDataById.set(data.piece.id, data);
    }
    return data;
  };

  const setPresence = (
    own: ReadingInstance[],
    remotes: ReadingInstance[][] = []
  ) => {
    userPresenceServicePort.getOwnUserPresence.mockReturnValue(own);
    userPresenceServicePort.getRemotesUserPresence.mockReturnValue(
      new Map(remotes.map((instances, i) => [`remote-${i}`, instances]))
    );
  };

  const setChapterActivity = (count: number): ReadingInstance[] => {
    const own = makeInstance({
      id: "own-instance",
      connectionId: OWN_CONNECTION_ID,
      selected: true,
    });
    const remotes = Array.from({ length: count - 1 }, (_, i) =>
      makeInstance({
        id: `remote-instance-${i}`,
        connectionId: `remote-connection-${i}`,
      })
    );
    setPresence(
      [own],
      remotes.map((instance) => [instance])
    );
    return [own, ...remotes];
  };

  const makeShowableChapter = (
    activityIndicators: ActivityIndicatorData[] = []
  ): StackChapterData => {
    const data = register(makeChapterData({ activityIndicators }));
    placeSelectedOnGround(data);
    return data;
  };

  const lastShownCommands = (): AnyShowIndicatorCommand[] => {
    const command =
      activityIndicatorsAdapterPort.showIndicators.mock.lastCall![0].command;
    return Array.isArray(command) ? command : [command];
  };

  const findExtraCommand = (commands: AnyShowIndicatorCommand[]) =>
    commands.find(
      (command): command is ShowExtraContentIndicatorCommand =>
        command.type === "extraContent"
    );

  beforeEach(() => {
    pieceDataById = new Map();

    dataRegistryPort = {
      getDataById: vi.fn(),
      getPieceData: vi.fn(),
      getAllPiecesDataByType: vi.fn(),
    } as unknown as Mocked<DataRegistryPort>;

    arrangementServicePort = {
      getArrangementByIndex: vi.fn(),
      getAllArrangements: vi.fn(),
      getCurrentArrangementIndex: vi.fn(),
      setCurrentArrangementIndex: vi.fn(),
      setArrangementIndexByName: vi.fn(),
      getArrangementIndexByName: vi.fn(),
      getCurrentArrangement: vi.fn(),
      getCurrentArrangementName: vi.fn(),
      addCustomArrangement: vi.fn(),
      removeCustomArrangement: vi.fn(),
      getBooksNamesBySectionName: vi.fn(),
      getBookInfoPathById: vi.fn(),
      getBookByIndices: vi.fn(),
      getTestamentByIndices: vi.fn(),
      getBookSubsetByCompleteId: vi.fn(),
      getSectionByIndices: vi.fn(),
    };

    labelDataStorePort = {
      getDataByTransformerId: vi.fn(),
      getDataByTailId: vi.fn(),
      getDataByTextId: vi.fn(),
      addLabelData: vi.fn(),
      removeLabelData: vi.fn(),
      getAllLabelsData: vi.fn(),
      getDataByOwnerId: vi.fn(),
    };

    userPresenceServicePort = {
      update: vi.fn(),
      getUserPresence: vi.fn(),
      getOwnConnectionId: vi.fn(),
      getOwnUserPresence: vi.fn(),
      getRemotesUserPresence: vi.fn(),
      getOwnUserSelectedInstance: vi.fn(),
    };

    activityIndicatorsAdapterPort = {
      showIndicators: vi.fn(),
      hideIndicators: vi.fn(),
      hideIndicator: vi.fn(),
      updateIndicatorsPosition: vi.fn(),
    };

    activityIndicatorLifecyclePort = {
      spawnActivityIndicatorDomain: vi.fn(),
    };

    activityNotificationAdapterPort = {
      hideNotification: vi.fn(),
      showNotification: vi.fn(),
      updateNotificationPosition: vi.fn(),
      updateNotificationDirection: vi.fn(),
    };

    userIdentityStorePort = {
      getUserDataByIds: vi.fn(),
    };

    idGeneratorPort = {
      getId: vi.fn(),
    };

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    eventBus = {
      subscribe: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    } as unknown as Mocked<BaseEventManager<BibleStackEvents>>;

    dataRegistryPort.getPieceData.mockImplementation(((piece: Piece) =>
      pieceDataById.get(piece.id)) as GetPieceData);
    dataRegistryPort.getAllPiecesDataByType.mockReturnValue([]);

    arrangementServicePort.getBookInfoPathById.mockImplementation(
      ({ id }) => BOOK_PATHS[id] ?? { found: false, arrangementIndex: 0 }
    );
    arrangementServicePort.getBookSubsetByCompleteId.mockImplementation(
      ({ id, chapterNumber }) =>
        id === PSALMS_BOOK_TWO.completeBookId &&
        chapterNumber > PSALMS_BOOK_TWO.startIndex
          ? PSALMS_BOOK_TWO
          : undefined
    );
    arrangementServicePort.getTestamentByIndices.mockImplementation(
      ({ testamentIndex }) => TESTAMENTS[testamentIndex]
    );
    arrangementServicePort.getSectionByIndices.mockImplementation(
      ({ testamentIndex, sectionIndex }) =>
        TESTAMENTS[testamentIndex]?.sections[sectionIndex]
    );

    setPresence([]);
    userPresenceServicePort.getOwnConnectionId.mockReturnValue(
      OWN_CONNECTION_ID
    );

    let nextId = 0;
    idGeneratorPort.getId.mockImplementation(() => `generated-${nextId++}`);
    activityIndicatorLifecyclePort.spawnActivityIndicatorDomain.mockImplementation(
      (dataId) => ({
        id: `${dataId}-piece`,
        type: "ActivityIndicator",
        dataId,
      })
    );

    service = createService();
  });

  describe("getPieceActivity", () => {
    it("logs an error and returns an empty array if the provided piece's type is not supported by the established strategies", () => {
      setPresence([
        makeInstance({ id: "instance", connectionId: "connection" }),
      ]);

      const result = service.getPieceActivity({
        piece: { id: "verse-piece", type: "Verse" },
      });

      expect(result).toEqual([]);
      expect(loggerPort.error).toHaveBeenCalledWith(
        "PieceActivityService: strategy not found at getPieceActivity"
      );
    });

    it("logs an error and return an empty array if no data found for piece", () => {
      setPresence([
        makeInstance({ id: "instance", connectionId: "connection" }),
      ]);

      const result = service.getPieceActivity({
        piece: { id: "unregistered-chapter", type: "StackChapter" },
      });

      expect(result).toEqual([]);
      expect(loggerPort.error).toHaveBeenCalledWith(
        "PieceActivityService: data not found at chapterActivityStrategy"
      );
    });

    it("uses either the own user presence and the remotes user presence", () => {
      const own = makeInstance({ id: "own", connectionId: OWN_CONNECTION_ID });
      const remoteA = makeInstance({ id: "remote-a", connectionId: "a" });
      const remoteB = makeInstance({ id: "remote-b", connectionId: "b" });
      setPresence([own], [[remoteA], [remoteB]]);
      const chapter = register(makeChapterData());

      const result = service.getPieceActivity({ piece: chapter.piece! });

      expect(result).toEqual([own, remoteA, remoteB]);
    });

    it("tries to find the info path from the instance's bookId and chapter", () => {
      const instance = makeInstance({
        id: "instance",
        connectionId: "connection",
        bookId: "MAT",
        chapter: 5,
      });
      setPresence([instance]);
      const readChapter = register(
        makeChapterData({ pieceId: "mat-5", bookId: "MAT", number: 5 })
      );
      const otherChapter = register(
        makeChapterData({ pieceId: "mat-6", bookId: "MAT", number: 6 })
      );

      expect(service.getPieceActivity({ piece: readChapter.piece! })).toEqual([
        instance,
      ]);
      expect(service.getPieceActivity({ piece: otherChapter.piece! })).toEqual(
        []
      );
      expect(arrangementServicePort.getBookInfoPathById).toHaveBeenCalledWith({
        id: "MAT",
      });
    });

    it("looks for a subset book if not info path found", () => {
      setPresence([
        makeInstance({ id: "genesis", connectionId: "a", bookId: "GEN" }),
        makeInstance({
          id: "psalms",
          connectionId: "b",
          bookId: "PSA",
          chapter: 45,
        }),
      ]);
      const chapter = register(makeChapterData());

      service.getPieceActivity({ piece: chapter.piece! });

      expect(
        arrangementServicePort.getBookSubsetByCompleteId
      ).toHaveBeenCalledTimes(1);
      expect(
        arrangementServicePort.getBookSubsetByCompleteId
      ).toHaveBeenCalledWith({ id: "PSA", chapterNumber: 45 });
    });

    it("uses book subset's id and start index if found, instead of the reading instance's book and chapter", () => {
      const instance = makeInstance({
        id: "psalms",
        connectionId: "connection",
        bookId: "PSA",
        chapter: 45,
      });
      setPresence([instance]);
      const subsetChapter = register(
        makeChapterData({ pieceId: "psa-2-4", bookId: "PSA-2", number: 4 })
      );
      const completeChapter = register(
        makeChapterData({ pieceId: "psa-45", bookId: "PSA", number: 45 })
      );
      const subsetBook = register(makeBookData("PSA-2"));

      expect(service.getPieceActivity({ piece: subsetChapter.piece! })).toEqual(
        [instance]
      );
      expect(service.getPieceActivity({ piece: subsetBook.piece! })).toEqual([
        instance,
      ]);
      expect(
        service.getPieceActivity({ piece: completeChapter.piece! })
      ).toEqual([]);
    });

    it("omits the instance from the activity if no regular or subset book info path found", () => {
      const genesis = makeInstance({ id: "genesis", connectionId: "a" });
      const unknown = makeInstance({
        id: "unknown",
        connectionId: "b",
        bookId: "UNKNOWN",
      });
      setPresence([genesis, unknown]);
      const testament = register(makeTestamentData(OLD_TESTAMENT, 0));

      const result = service.getPieceActivity({ piece: testament.piece! });

      expect(result).toEqual([genesis]);
      expect(
        arrangementServicePort.getTestamentByIndices
      ).toHaveBeenCalledTimes(1);
    });

    it("looks for testament info with the found path values", () => {
      const instance = makeInstance({
        id: "matthew",
        connectionId: "connection",
        bookId: "MAT",
      });
      setPresence([instance]);
      const newTestament = register(makeTestamentData(NEW_TESTAMENT, 1));
      const oldTestament = register(makeTestamentData(OLD_TESTAMENT, 0));

      expect(service.getPieceActivity({ piece: newTestament.piece! })).toEqual([
        instance,
      ]);
      expect(service.getPieceActivity({ piece: oldTestament.piece! })).toEqual(
        []
      );
      expect(arrangementServicePort.getTestamentByIndices).toHaveBeenCalledWith(
        { arrangementIndex: 0, testamentIndex: 1 }
      );
    });

    it("logs an error and omits instance if no testament info found for path values provided", () => {
      const own = makeInstance({ id: "own", connectionId: OWN_CONNECTION_ID });
      const remote = makeInstance({ id: "remote", connectionId: "remote" });
      setPresence([own], [[remote]]);
      arrangementServicePort.getTestamentByIndices.mockReturnValueOnce(
        undefined
      );
      const chapter = register(makeChapterData());

      const result = service.getPieceActivity({ piece: chapter.piece! });

      expect(result).toEqual([remote]);
      expect(loggerPort.error).toHaveBeenCalledWith(
        "PieceActivityService: testament not found at getPieceActivity"
      );
    });

    it("looks for section info with the found path values", () => {
      const instance = makeInstance({
        id: "matthew",
        connectionId: "connection",
        bookId: "MAT",
      });
      setPresence([instance]);
      const gospels = register(makeSectionData(NEW_TESTAMENT.sections[0]!));
      const law = register(makeSectionData(OLD_TESTAMENT.sections[0]!));

      expect(service.getPieceActivity({ piece: gospels.piece! })).toEqual([
        instance,
      ]);
      expect(service.getPieceActivity({ piece: law.piece! })).toEqual([]);
      expect(arrangementServicePort.getSectionByIndices).toHaveBeenCalledWith({
        arrangementIndex: 0,
        testamentIndex: 1,
        sectionIndex: 0,
      });
    });

    it("logs an error and omits instance if no section info found for path values provided", () => {
      const own = makeInstance({ id: "own", connectionId: OWN_CONNECTION_ID });
      const remote = makeInstance({ id: "remote", connectionId: "remote" });
      setPresence([own], [[remote]]);
      arrangementServicePort.getSectionByIndices.mockReturnValueOnce(undefined);
      const chapter = register(makeChapterData());

      const result = service.getPieceActivity({ piece: chapter.piece! });

      expect(result).toEqual([remote]);
      expect(loggerPort.error).toHaveBeenCalledWith(
        "PieceActivityService: section not found at getPieceActivity"
      );
    });

    it("returns every reading instance which path contain the provided piece, deduped by connection id", () => {
      const ownUnselected = makeInstance({
        id: "own-unselected",
        connectionId: OWN_CONNECTION_ID,
        chapter: 1,
      });
      const ownSelected = makeInstance({
        id: "own-selected",
        connectionId: OWN_CONNECTION_ID,
        chapter: 2,
        selected: true,
      });
      const ownElsewhere = makeInstance({
        id: "own-elsewhere",
        connectionId: OWN_CONNECTION_ID,
        bookId: "MAT",
        selected: true,
      });
      const remoteSelected = makeInstance({
        id: "remote-selected",
        connectionId: "remote",
        chapter: 3,
        selected: true,
      });
      const remoteUnselected = makeInstance({
        id: "remote-unselected",
        connectionId: "remote",
        chapter: 4,
      });
      setPresence(
        [ownUnselected, ownSelected, ownElsewhere],
        [[remoteSelected, remoteUnselected]]
      );
      const genesis = register(makeBookData("GEN"));

      const result = service.getPieceActivity({ piece: genesis.piece! });

      expect(result).toEqual([ownSelected, remoteSelected]);
    });
  });

  describe("getActivityIndicatorsForPiece", () => {
    it("logs an error and returns an empty array if the provided piece's type is not supported by the stablished strategies", () => {
      const result = service.getActivityIndicatorsForPiece({
        id: "book-piece",
        type: "StackBook",
      });

      expect(result).toEqual([]);
      expect(loggerPort.error).toHaveBeenCalledWith(
        "PieceActivityService: strategy not found at getActivityIndicatorsForPiece"
      );
    });

    it("logs an error and return an empty array if no data found for piece", () => {
      const result = service.getActivityIndicatorsForPiece({
        id: "unregistered-chapter",
        type: "StackChapter",
      });

      expect(result).toEqual([]);
      expect(loggerPort.error).toHaveBeenCalledWith(
        "PieceActivityService: pieceData not found"
      );
    });

    it("logs an error and return an empty array if no data found for label", () => {
      labelDataStorePort.getDataByTransformerId.mockReturnValue(undefined);

      const result = service.getActivityIndicatorsForPiece({
        id: "transformer-piece",
        type: "InfoLabelTransformer",
      });

      expect(result).toEqual([]);
      expect(loggerPort.error).toHaveBeenCalledWith(
        "PieceActivityService: labelData not found"
      );
    });

    it("successfully gets the activity indicator from the found data", () => {
      const chapterIndicator = makeIndicator({ id: "chapter", index: 0 });
      const chapter = register(
        makeChapterData({ activityIndicators: [chapterIndicator] })
      );
      const labelIndicator = makeIndicator({ id: "label", index: 0 });
      const label = makeLabelData({
        owner: { id: "book-piece", type: "StackBook" },
        activityIndicators: [labelIndicator],
      });
      labelDataStorePort.getDataByTransformerId.mockImplementation((id) =>
        id === label.transformer.id ? label : undefined
      );

      expect(service.getActivityIndicatorsForPiece(chapter.piece!)).toEqual([
        chapterIndicator,
      ]);
      expect(service.getActivityIndicatorsForPiece(label.transformer)).toEqual([
        labelIndicator,
      ]);
      expect(loggerPort.error).not.toHaveBeenCalled();
    });
  });

  describe("getActivityIndicatorByType", () => {
    it("returns the first indicator from the piece that matches the type", () => {
      const firstRegular = makeIndicator({ id: "regular-0", index: 0 });
      const secondRegular = makeIndicator({ id: "regular-1", index: 1 });
      const extra = makeIndicator({
        id: "extra",
        index: 2,
        indicatorType: "extraContent",
      });
      const chapter = register(
        makeChapterData({
          activityIndicators: [extra, firstRegular, secondRegular],
        })
      );

      expect(
        service.getActivityIndicatorByType(chapter.piece!, "regular")
      ).toBe(firstRegular);
      expect(
        service.getActivityIndicatorByType(chapter.piece!, "extraContent")
      ).toBe(extra);
    });

    it("returns undefined if no indicator matches the type", () => {
      const chapter = register(
        makeChapterData({
          activityIndicators: [makeIndicator({ id: "regular", index: 0 })],
        })
      );

      expect(
        service.getActivityIndicatorByType(chapter.piece!, "extraContent")
      ).toBeUndefined();
    });
  });

  describe("getExtraActivityIndicatorsForPiece", () => {
    it("successfully returns the extra indicator content if the piece has one", () => {
      const extra = makeIndicator({
        id: "extra",
        index: 1,
        indicatorType: "extraContent",
      });
      const chapter = register(
        makeChapterData({
          activityIndicators: [
            makeIndicator({ id: "regular", index: 0 }),
            extra,
          ],
        })
      );

      expect(
        service.getExtraActivityIndicatorsForPiece(chapter.piece!)
      ).toEqual({ extraIndicatorContent: extra });
    });

    it("returns undefined if the piece has no extra indicator", () => {
      const chapter = register(
        makeChapterData({
          activityIndicators: [makeIndicator({ id: "regular", index: 0 })],
        })
      );

      expect(
        service.getExtraActivityIndicatorsForPiece(chapter.piece!)
      ).toEqual({ extraIndicatorContent: undefined });
    });
  });

  describe("getPieceIndicatorByActivityIndex", () => {
    it("returns the first regular indicator that matches the index from the piece", () => {
      const extra = makeIndicator({
        id: "extra",
        index: 1,
        indicatorType: "extraContent",
      });
      const regular = makeIndicator({ id: "regular-1", index: 1 });
      const chapter = register(
        makeChapterData({
          activityIndicators: [
            makeIndicator({ id: "regular-0", index: 0 }),
            extra,
            regular,
          ],
        })
      );

      expect(service.getPieceIndicatorByActivityIndex(chapter.piece!, 1)).toBe(
        regular
      );
    });

    it("returns undefined in no indicator matches the criteria", () => {
      const chapter = register(
        makeChapterData({
          activityIndicators: [
            makeIndicator({ id: "regular-0", index: 0 }),
            makeIndicator({
              id: "extra",
              index: 1,
              indicatorType: "extraContent",
            }),
          ],
        })
      );

      expect(
        service.getPieceIndicatorByActivityIndex(chapter.piece!, 1)
      ).toBeUndefined();
      expect(
        service.getPieceIndicatorByActivityIndex(chapter.piece!, 5)
      ).toBeUndefined();
    });
  });

  describe("getDataActivityIndicatorByType", () => {
    it("returns the first indicator from the piece data that matches the type", () => {
      const firstRegular = makeIndicator({ id: "regular-0", index: 0 });
      const extra = makeIndicator({
        id: "extra",
        index: 2,
        indicatorType: "extraContent",
      });
      const chapter = makeChapterData({
        activityIndicators: [
          extra,
          firstRegular,
          makeIndicator({ id: "regular-1", index: 1 }),
        ],
      });

      expect(service.getDataActivityIndicatorByType(chapter, "regular")).toBe(
        firstRegular
      );
      expect(
        service.getDataActivityIndicatorByType(chapter, "extraContent")
      ).toBe(extra);
    });

    it("returns undefined if no indicator matches the type", () => {
      const chapter = makeChapterData({
        activityIndicators: [makeIndicator({ id: "regular", index: 0 })],
      });

      expect(
        service.getDataActivityIndicatorByType(chapter, "extraContent")
      ).toBeUndefined();
    });
  });

  describe("getDataExtraActivityIndicators", () => {
    it("successfully returns the extra indicator content if the piece data has one", () => {
      const extra = makeIndicator({
        id: "extra",
        index: 1,
        indicatorType: "extraContent",
      });
      const chapter = makeChapterData({
        activityIndicators: [makeIndicator({ id: "regular", index: 0 }), extra],
      });

      expect(service.getDataExtraActivityIndicators(chapter)).toEqual({
        extraIndicatorContent: extra,
      });
    });

    it("returns undefined if the piece data has no extra indicator", () => {
      const chapter = makeChapterData({
        activityIndicators: [makeIndicator({ id: "regular", index: 0 })],
      });

      expect(service.getDataExtraActivityIndicators(chapter)).toEqual({
        extraIndicatorContent: undefined,
      });
    });
  });

  describe("getDataIndicatorByActivityIndex", () => {
    it("returns the first regular indicator that matches the index from the piece data", () => {
      const regular = makeIndicator({ id: "regular-1", index: 1 });
      const chapter = makeChapterData({
        activityIndicators: [
          makeIndicator({ id: "regular-0", index: 0 }),
          makeIndicator({
            id: "extra",
            index: 1,
            indicatorType: "extraContent",
          }),
          regular,
        ],
      });

      expect(service.getDataIndicatorByActivityIndex(chapter, 1)).toBe(regular);
    });

    it("returns undefined in no indicator matches the criteria", () => {
      const chapter = makeChapterData({
        activityIndicators: [
          makeIndicator({ id: "regular-0", index: 0 }),
          makeIndicator({
            id: "extra",
            index: 1,
            indicatorType: "extraContent",
          }),
        ],
      });

      expect(
        service.getDataIndicatorByActivityIndex(chapter, 1)
      ).toBeUndefined();
      expect(
        service.getDataIndicatorByActivityIndex(chapter, 5)
      ).toBeUndefined();
    });
  });

  describe("tryHideIndicators", () => {
    it("successfully clears the indicators from the container", () => {
      const chapter = makeChapterData({
        activityIndicators: [
          makeIndicator({ id: "regular-0", index: 0 }),
          makeIndicator({ id: "regular-1", index: 1 }),
        ],
      });

      service.tryHideIndicators(chapter);

      expect(chapter.activityIndicators).toEqual([]);
    });

    it("successfully hides any cleared indicator and returns true", () => {
      const indicators = [
        makeIndicator({ id: "regular-0", index: 0 }),
        makeIndicator({ id: "regular-1", index: 1 }),
      ];
      const chapter = makeChapterData({ activityIndicators: [...indicators] });

      const result = service.tryHideIndicators(chapter);

      expect(result).toBe(true);
      expect(activityIndicatorsAdapterPort.hideIndicators).toHaveBeenCalledWith(
        indicators
      );
    });

    it("returns false if there are no indicators to hide", () => {
      const chapter = makeChapterData();

      const result = service.tryHideIndicators(chapter);

      expect(result).toBe(false);
      expect(
        activityIndicatorsAdapterPort.hideIndicators
      ).not.toHaveBeenCalled();
    });
  });

  describe("updateIndicators", () => {
    it("no-ops and returns an empty array if the container is instance of StackChapterData and has no piece attached", () => {
      setChapterActivity(2);
      const indicator = makeIndicator({ id: "regular", index: 0 });
      const chapter = makeChapterData({
        withPiece: false,
        activityIndicators: [indicator],
      });

      const result = createService(2).updateIndicators(chapter);

      expect(result).toEqual([]);
      expect(chapter.activityIndicators).toEqual([indicator]);
      expect(
        activityIndicatorsAdapterPort.hideIndicators
      ).not.toHaveBeenCalled();
      expect(
        activityIndicatorsAdapterPort.showIndicators
      ).not.toHaveBeenCalled();
    });

    it("tries to hide the indicators and returns an empty array if there is no activity", () => {
      const indicator = makeIndicator({ id: "regular", index: 0 });
      const chapter = makeShowableChapter([indicator]);

      const result = createService(2).updateIndicators(chapter);

      expect(result).toEqual([]);
      expect(chapter.activityIndicators).toEqual([]);
      expect(activityIndicatorsAdapterPort.hideIndicators).toHaveBeenCalledWith(
        [indicator]
      );
      expect(
        activityIndicatorsAdapterPort.showIndicators
      ).not.toHaveBeenCalled();
    });

    it("tries to hide the indicators and returns an empty array if container is a StackChapterData and shouldShowActivityIndicators returns false", () => {
      setChapterActivity(2);
      const indicator = makeIndicator({ id: "regular", index: 0 });
      const chapter = register(
        makeChapterData({ activityIndicators: [indicator] })
      );

      const result = createService(2).updateIndicators(chapter);

      expect(result).toEqual([]);
      expect(chapter.activityIndicators).toEqual([]);
      expect(activityIndicatorsAdapterPort.hideIndicators).toHaveBeenCalledWith(
        [indicator]
      );
      expect(
        activityIndicatorsAdapterPort.showIndicators
      ).not.toHaveBeenCalled();
    });

    it("hides and removes from the container every current regular indicator which index is greater or equal to either the activity count or the provided indicator limit", () => {
      setChapterActivity(2);
      const [first, second, third] = [0, 1, 2].map((index) =>
        makeIndicator({ id: `regular-${index}`, index })
      );
      const boundedByActivity = makeShowableChapter([first!, second!, third!]);

      createService(3).updateIndicators(boundedByActivity);

      expect(activityIndicatorsAdapterPort.hideIndicator).toHaveBeenCalledWith(
        third
      );
      expect(boundedByActivity.activityIndicators).toEqual([first, second]);

      activityIndicatorsAdapterPort.hideIndicator.mockClear();
      setChapterActivity(3);
      const [limitFirst, limitSecond] = [0, 1].map((index) =>
        makeIndicator({ id: `limit-regular-${index}`, index })
      );
      const boundedByLimit = makeShowableChapter([limitFirst!, limitSecond!]);

      createService(1).updateIndicators(boundedByLimit);

      expect(activityIndicatorsAdapterPort.hideIndicator).toHaveBeenCalledWith(
        limitSecond
      );
      expect(
        boundedByLimit.activityIndicators.filter(
          (indicator) => indicator.indicatorType === "regular"
        )
      ).toEqual([limitFirst]);
    });

    it("hides and removes from the container the extra indicator if exists and there is less or equal activity than the indicator limit", () => {
      setChapterActivity(2);
      const extra = makeIndicator({
        id: "extra",
        index: 2,
        indicatorType: "extraContent",
      });
      const chapter = makeShowableChapter([
        makeIndicator({ id: "regular", index: 0 }),
        extra,
      ]);

      createService(2).updateIndicators(chapter);

      expect(activityIndicatorsAdapterPort.hideIndicator).toHaveBeenCalledWith(
        extra
      );
      expect(chapter.activityIndicators).not.toContain(extra);
      expect(findExtraCommand(lastShownCommands())).toBeUndefined();
    });

    it("includes a ShowExtraContentIndicatorCommand in the command list if the activity count is greater than the indicators limit", () => {
      setChapterActivity(3);
      const chapter = makeShowableChapter();

      createService(2).updateIndicators(chapter);

      expect(findExtraCommand(lastShownCommands())).toBeDefined();
    });

    it("reuses the current extra indicator, if there is none it creates a new one", () => {
      setChapterActivity(3);
      const existingExtra = makeIndicator({
        id: "extra",
        index: 9,
        indicatorType: "extraContent",
      });
      const withExtra = makeShowableChapter([existingExtra]);

      createService(2).updateIndicators(withExtra);

      expect(findExtraCommand(lastShownCommands())!.indicator).toBe(
        existingExtra
      );
      expect(
        withExtra.activityIndicators.filter(
          (indicator) => indicator.indicatorType === "extraContent"
        )
      ).toEqual([existingExtra]);

      const withoutExtra = makeShowableChapter();

      createService(2).updateIndicators(withoutExtra);

      const createdExtra = findExtraCommand(lastShownCommands())!.indicator;
      expect(withoutExtra.activityIndicators).toContain(createdExtra);
      expect(createdExtra).toMatchObject({
        indicatorType: "extraContent",
        containerDataId: withoutExtra.id,
        containerPieceId: withoutExtra.piece!.id,
        containerType: "StackChapter",
        piece: {
          id: `${createdExtra.id}-piece`,
          type: "ActivityIndicator",
          dataId: createdExtra.id,
        },
      });
      expect(createdExtra.background).toBeDefined();
    });

    it("sets the extra indicator command's index as the last one in the list", () => {
      setChapterActivity(4);
      const chapter = makeShowableChapter();

      createService(2).updateIndicators(chapter);

      const commands = lastShownCommands();
      expect(commands).toHaveLength(3);
      expect(findExtraCommand(commands)!.index).toBe(commands.length - 1);
    });

    it("makes the indicator data's index the same as the one in the command", () => {
      setChapterActivity(3);
      const extra = makeIndicator({
        id: "extra",
        index: 9,
        indicatorType: "extraContent",
      });
      const chapter = makeShowableChapter([extra]);

      createService(2).updateIndicators(chapter);

      const extraCommand = findExtraCommand(lastShownCommands())!;
      expect(extraCommand.index).toBe(2);
      expect(extra.index).toBe(extraCommand.index);
    });

    it("sets the extra indicator command's extraUsers as the delta between the activity count and the indicators limit", () => {
      setChapterActivity(5);
      const chapter = makeShowableChapter();

      createService(2).updateIndicators(chapter);

      expect(findExtraCommand(lastShownCommands())!.extraUsers).toBe(3);
    });

    it("extra indicator is always the last on in the list", () => {
      setChapterActivity(4);
      const chapter = makeShowableChapter([
        makeIndicator({ id: "extra", index: 0, indicatorType: "extraContent" }),
        makeIndicator({ id: "regular-1", index: 1 }),
        makeIndicator({ id: "regular-0", index: 0 }),
      ]);

      createService(2).updateIndicators(chapter);

      expect(lastShownCommands().map((command) => command.type)).toEqual([
        "regular",
        "regular",
        "extraContent",
      ]);
    });

    it("orders the command list's regular indicator commands matching the activity order", () => {
      const activity = setChapterActivity(3);
      const colors = new Map(
        activity.map((instance, i) => [instance.connectionId, `#00000${i}`])
      );
      userIdentityStorePort.getUserDataByIds.mockImplementation(
        ({ connectionId }) =>
          makeIdentity({
            connectionId: connectionId!,
            color: colors.get(connectionId!)!,
            icon: "icon",
          })
      );
      const chapter = makeShowableChapter([
        makeIndicator({ id: "regular-2", index: 2 }),
        makeIndicator({ id: "regular-0", index: 0 }),
      ]);

      createService(3).updateIndicators(chapter);

      const commands = lastShownCommands();
      expect(commands.map((command) => command.index)).toEqual([0, 1, 2]);
      expect(
        commands.map((command) => command.type === "regular" && command.color)
      ).toEqual(activity.map((instance) => colors.get(instance.connectionId)));
    });

    it("reuses an indicator in the same index, otherwise it creates a new one", () => {
      setChapterActivity(2);
      const existing = makeIndicator({ id: "regular-0", index: 0 });
      const chapter = makeShowableChapter([existing]);

      createService(2).updateIndicators(chapter);

      const [first, second] = lastShownCommands();
      expect(first!.indicator).toBe(existing);
      expect(second!.indicator).not.toBe(existing);
      expect(second!.indicator).toMatchObject({
        index: 1,
        indicatorType: "regular",
      });
      expect(chapter.activityIndicators).toEqual([existing, second!.indicator]);
    });

    it("uses in the command the identity provided by the user color store", () => {
      const [own] = setChapterActivity(2);
      userIdentityStorePort.getUserDataByIds.mockImplementation(
        ({ connectionId }) =>
          connectionId === own!.connectionId
            ? makeIdentity({
                connectionId,
                color: "#ff0000",
                icon: "own-icon",
                pictureUrl: "https://example.com/own.png",
              })
            : undefined
      );
      const chapter = makeShowableChapter();

      createService(2).updateIndicators(chapter);

      const [identified, anonymous] = lastShownCommands();
      expect(identified).toMatchObject({
        color: "#ff0000",
        icon: "own-icon",
        pictureUrl: "https://example.com/own.png",
      });
      expect(anonymous).toMatchObject({
        color: "#ffffff",
        icon: "",
        pictureUrl: undefined,
      });
    });

    it("successfully shows the indicators", () => {
      setChapterActivity(2);
      const chapter = makeShowableChapter();

      createService(2).updateIndicators(chapter);

      const [ownIndicator, remoteIndicator] = chapter.activityIndicators;
      expect(activityIndicatorsAdapterPort.showIndicators).toHaveBeenCalledWith(
        {
          container: chapter,
          command: [
            {
              type: "regular",
              index: 0,
              indicator: ownIndicator,
              isSelected: true,
              isOwnUser: true,
              color: "#ffffff",
              icon: "",
              pictureUrl: undefined,
            },
            {
              type: "regular",
              index: 1,
              indicator: remoteIndicator,
              isSelected: false,
              isOwnUser: false,
              color: "#ffffff",
              icon: "",
              pictureUrl: undefined,
            },
          ],
        }
      );
    });

    it("successfully updates the indicators position", () => {
      setChapterActivity(1);
      const chapter = makeShowableChapter();

      createService(2).updateIndicators(chapter);

      expect(
        activityIndicatorsAdapterPort.updateIndicatorsPosition
      ).toHaveBeenCalledWith(chapter);
    });

    it("successfully returns the updated indicators", () => {
      setChapterActivity(3);
      const chapter = makeShowableChapter();

      const result = createService(2).updateIndicators(chapter);

      expect(result).toHaveLength(3);
      expect(result).toEqual(chapter.activityIndicators);
    });
  });

  describe("updateAllIndicators", () => {
    it("performs the indicators update in batch for every label and chapter data provided.", () => {
      setChapterActivity(1);
      const book = register(makeBookData("GEN"));
      const visibleLabel = makeLabelData({
        id: "visible-label",
        owner: book.piece!,
      });
      const hidingLabel = makeLabelData({
        id: "hiding-label",
        owner: book.piece!,
      });
      hidingLabel.beginHiding();
      const chapter = makeShowableChapter();
      labelDataStorePort.getAllLabelsData.mockReturnValue([
        visibleLabel,
        hidingLabel,
      ]);
      dataRegistryPort.getAllPiecesDataByType.mockReturnValue([chapter]);

      createService(2).updateAllIndicators();

      expect(visibleLabel.activityIndicators).toHaveLength(1);
      expect(visibleLabel.activityIndicators[0]).toMatchObject({
        containerType: "InfoLabelTransformer",
        containerPieceId: visibleLabel.transformer.id,
      });
      expect(chapter.activityIndicators).toHaveLength(1);
      expect(hidingLabel.activityIndicators).toEqual([]);
      expect(
        activityIndicatorsAdapterPort.showIndicators.mock.calls.map(
          ([command]) => command.container
        )
      ).toEqual([visibleLabel, chapter]);
    });
  });

  describe("tryHideNotification", () => {
    it("successfully detaches a notification", () => {
      const chapter = makeChapterData({
        activityNotification: makeNotification("notification"),
      });

      service.tryHideNotification(chapter);

      expect(chapter.activityNotification).toBeUndefined();
    });

    it("successfully hides a detached notification and returns true", () => {
      const notification = makeNotification("notification");
      const chapter = makeChapterData({ activityNotification: notification });

      const result = service.tryHideNotification(chapter);

      expect(result).toBe(true);
      expect(
        activityNotificationAdapterPort.hideNotification
      ).toHaveBeenCalledWith(notification);
    });

    it("no-ops and returns false if no notification detached", () => {
      const chapter = makeChapterData();

      const result = service.tryHideNotification(chapter);

      expect(result).toBe(false);
      expect(
        activityNotificationAdapterPort.hideNotification
      ).not.toHaveBeenCalled();
    });
  });

  describe("updateNotification", () => {
    const newNotification = makeNotification("new-notification");
    let ownInstance: ReadingInstance;

    const makeNotifiableChapter = (
      params: Parameters<typeof makeChapterData>[0] = {}
    ): StackChapterData => {
      const data = register(makeChapterData(params));
      data.activate();
      return data;
    };

    beforeEach(() => {
      ownInstance = makeInstance({
        id: "own-instance",
        connectionId: OWN_CONNECTION_ID,
        selected: true,
      });
      setPresence([ownInstance]);
      userPresenceServicePort.getOwnUserSelectedInstance.mockReturnValue(
        ownInstance
      );
      activityNotificationAdapterPort.showNotification.mockReturnValue(
        newNotification
      );
    });

    it("no-ops if container is not active or has no piece attached", () => {
      const inactiveNotification = makeNotification("inactive-notification");
      const inactive = register(
        makeChapterData({ activityNotification: inactiveNotification })
      );
      const pieceless = makeChapterData({
        withPiece: false,
        activityNotification: makeNotification("pieceless-notification"),
      });
      pieceless.activate();
      const piecelessNotification = pieceless.activityNotification;

      service.updateNotification(inactive);
      service.updateNotification(pieceless);

      expect(inactive.activityNotification).toBe(inactiveNotification);
      expect(pieceless.activityNotification).toBe(piecelessNotification);
      expect(
        activityNotificationAdapterPort.showNotification
      ).not.toHaveBeenCalled();
      expect(
        activityNotificationAdapterPort.hideNotification
      ).not.toHaveBeenCalled();
    });

    it("no-ops if user has no selected instance", () => {
      userPresenceServicePort.getOwnUserSelectedInstance.mockReturnValue(
        undefined
      );
      const notification = makeNotification("notification");
      const chapter = makeNotifiableChapter({
        activityNotification: notification,
      });

      service.updateNotification(chapter);

      expect(chapter.activityNotification).toBe(notification);
      expect(
        activityNotificationAdapterPort.showNotification
      ).not.toHaveBeenCalled();
      expect(
        activityNotificationAdapterPort.hideNotification
      ).not.toHaveBeenCalled();
    });

    it("tries to hide the notification if matches the hide criteria", () => {
      const withoutActivity = makeNotifiableChapter({
        pieceId: "without-activity",
        number: 2,
        activityNotification: makeNotification("without-activity"),
      });
      const selectedOnGround = makeNotifiableChapter({
        pieceId: "selected-on-ground",
        activityNotification: makeNotification("selected-on-ground"),
      });
      placeSelectedOnGround(selectedOnGround);
      const highlighting = makeNotifiableChapter({
        pieceId: "highlighting",
        activityNotification: makeNotification("highlighting"),
      });
      highlighting.changeHighlightState(HighlightEvents.RequestHighlight);
      const highlightedUnselected = makeNotifiableChapter({
        pieceId: "highlighted-unselected",
        activityNotification: makeNotification("highlighted-unselected"),
      });
      highlightedUnselected.changeHighlightState(
        HighlightEvents.RequestHighlight
      );
      highlightedUnselected.changeHighlightState(
        HighlightEvents.SequenceComplete
      );

      for (const chapter of [
        withoutActivity,
        selectedOnGround,
        highlighting,
        highlightedUnselected,
      ]) {
        const notification = chapter.activityNotification;

        service.updateNotification(chapter);

        expect(chapter.activityNotification).toBeUndefined();
        expect(
          activityNotificationAdapterPort.hideNotification
        ).toHaveBeenCalledWith(notification);
      }
      expect(
        activityNotificationAdapterPort.showNotification
      ).not.toHaveBeenCalled();
    });

    it("successfully shows the notification if does not match the hide criteria", () => {
      const remote = makeInstance({
        id: "remote-instance",
        connectionId: "remote-connection",
        chapter: 2,
        selected: true,
      });
      setPresence([ownInstance], [[remote]]);
      const existingNotification = makeNotification("existing");
      const ownChapter = makeNotifiableChapter({
        pieceId: "own-chapter",
        activityNotification: existingNotification,
      });
      const remoteChapter = makeNotifiableChapter({
        pieceId: "remote-chapter",
        number: 2,
      });

      service.updateNotification(ownChapter);
      service.updateNotification(remoteChapter);

      expect(
        activityNotificationAdapterPort.showNotification
      ).toHaveBeenNthCalledWith(1, {
        isOwnUserInPiece: true,
        activityCount: 1,
        color: "#ffffff",
        container: ownChapter,
        notification: existingNotification,
      });
      expect(
        activityNotificationAdapterPort.showNotification
      ).toHaveBeenNthCalledWith(2, {
        isOwnUserInPiece: false,
        activityCount: 1,
        color: "#ffffff",
        container: remoteChapter,
        notification: undefined,
      });
      expect(
        activityNotificationAdapterPort.hideNotification
      ).not.toHaveBeenCalled();
    });

    it("uses the piece activity count as activityCount", () => {
      setPresence(
        [ownInstance],
        [
          [
            makeInstance({
              id: "selected-remote",
              connectionId: "a",
              selected: true,
            }),
          ],
          [makeInstance({ id: "unselected-remote", connectionId: "b" })],
        ]
      );
      const chapter = makeNotifiableChapter();

      service.updateNotification(chapter);

      expect(
        activityNotificationAdapterPort.showNotification
      ).toHaveBeenCalledWith(expect.objectContaining({ activityCount: 2 }));
    });

    it("tries to get the color from the identity provided by userColorStorePort, defaults to white", () => {
      userIdentityStorePort.getUserDataByIds.mockImplementation(
        ({ connectionId }) =>
          connectionId === OWN_CONNECTION_ID
            ? makeIdentity({ connectionId, color: "#ff0000", icon: "icon" })
            : undefined
      );
      const ownChapter = makeNotifiableChapter({ pieceId: "own-chapter" });

      service.updateNotification(ownChapter);

      expect(
        activityNotificationAdapterPort.showNotification
      ).toHaveBeenLastCalledWith(expect.objectContaining({ color: "#ff0000" }));

      userIdentityStorePort.getUserDataByIds.mockReturnValue(undefined);
      const anonymousChapter = makeNotifiableChapter({
        pieceId: "anonymous-chapter",
      });

      service.updateNotification(anonymousChapter);

      expect(
        activityNotificationAdapterPort.showNotification
      ).toHaveBeenLastCalledWith(expect.objectContaining({ color: "#ffffff" }));
    });

    it("attaches the new notification to the container", () => {
      const chapter = makeNotifiableChapter();

      service.updateNotification(chapter);

      expect(chapter.activityNotification).toBe(newNotification);
    });

    it("updates the new notification's position", () => {
      const chapter = makeNotifiableChapter();

      service.updateNotification(chapter);

      expect(
        activityNotificationAdapterPort.updateNotificationPosition
      ).toHaveBeenCalledWith(chapter);
    });

    it("updates the new notification's direction", () => {
      const chapter = makeNotifiableChapter();

      service.updateNotification(chapter);

      expect(
        activityNotificationAdapterPort.updateNotificationDirection
      ).toHaveBeenCalledWith(chapter);
    });
  });

  describe("updateAllNotifications", () => {
    it("updates the notification for all provided chapters in batch", () => {
      const ownInstance = makeInstance({
        id: "own-instance",
        connectionId: OWN_CONNECTION_ID,
        selected: true,
      });
      setPresence([ownInstance]);
      userPresenceServicePort.getOwnUserSelectedInstance.mockReturnValue(
        ownInstance
      );
      const firstNotification = makeNotification("first");
      const secondNotification = makeNotification("second");
      activityNotificationAdapterPort.showNotification
        .mockReturnValueOnce(firstNotification)
        .mockReturnValueOnce(secondNotification);
      const first = register(makeChapterData({ pieceId: "first" }));
      const second = register(makeChapterData({ pieceId: "second" }));
      first.activate();
      second.activate();
      dataRegistryPort.getAllPiecesDataByType.mockReturnValue([first, second]);

      service.updateAllNotifications();

      expect(first.activityNotification).toBe(firstNotification);
      expect(second.activityNotification).toBe(secondNotification);
    });
  });

  describe("hideAllNotifications", () => {
    it("hides the notification for all provided chapters in batch", () => {
      const firstNotification = makeNotification("first");
      const secondNotification = makeNotification("second");
      const first = makeChapterData({
        activityNotification: firstNotification,
      });
      const second = makeChapterData({
        activityNotification: secondNotification,
      });
      dataRegistryPort.getAllPiecesDataByType.mockReturnValue([first, second]);

      service.hideAllNotifications();

      expect(first.activityNotification).toBeUndefined();
      expect(second.activityNotification).toBeUndefined();
      expect(
        activityNotificationAdapterPort.hideNotification
      ).toHaveBeenCalledWith(firstNotification);
      expect(
        activityNotificationAdapterPort.hideNotification
      ).toHaveBeenCalledWith(secondNotification);
    });
  });

  describe("updateAllNotificationsDirection", () => {
    it("updates the notification direction for all provided chapters in batch", () => {
      const first = makeChapterData({
        activityNotification: makeNotification("first"),
      });
      const second = makeChapterData({
        activityNotification: makeNotification("second"),
      });
      dataRegistryPort.getAllPiecesDataByType.mockReturnValue([first, second]);

      service.updateAllNotificationsDirection();

      expect(
        activityNotificationAdapterPort.updateNotificationDirection.mock.calls
      ).toEqual([[first], [second]]);
    });

    it("omits any chapter with no attached notification", () => {
      const withNotification = makeChapterData({
        activityNotification: makeNotification("notification"),
      });
      const withoutNotification = makeChapterData();
      dataRegistryPort.getAllPiecesDataByType.mockReturnValue([
        withoutNotification,
        withNotification,
      ]);

      service.updateAllNotificationsDirection();

      expect(
        activityNotificationAdapterPort.updateNotificationDirection.mock.calls
      ).toEqual([[withNotification]]);
    });
  });
});
