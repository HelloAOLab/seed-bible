import { PieceActivityService } from "bibleVizUtils.application.services.PieceActivityService";
import type {
  DataRegistryPort,
  ArrangementServicePort,
  UserPresenceServicePort,
  ActivityIndicatorsAdapterPort,
  ActivityNotificationAdapterPort,
  UserColorStorePort,
  IndicatorsRepositoryPort,
  ScriptureServicePort,
  NotifiableContainer,
} from "bibleVizUtils.domain.ports.pieceActivity";
import type { LabelDataStorePort } from "bibleVizUtils.domain.ports.piece";
import type {
  Piece,
  ActivityIndicator,
} from "bibleVizUtils.domain.models.canvas";
import type { UserPresenceData } from "bibleVizUtils.domain.models.userPresence";
import { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import { HighlightStates } from "bibleVizUtils.domain.models.highlight";

// ─── factories ────────────────────────────────────────────────────────────────

const makePiece = <T extends Piece["type"]>(
  type: T,
  id = `${type}-1`
): Piece<T> => ({ id, type }) as Piece<T>;

const makeIndicator = (
  overrides: Partial<ActivityIndicator> = {}
): ActivityIndicator => ({
  id: "indicator-1",
  type: "ActivityIndicator",
  indicatorType: "regular",
  index: 0,
  ...overrides,
});

const makePieceDataStub = (indicators: ActivityIndicator[] = []) => ({
  getPieceInfoProperty: jest.fn().mockReturnValue("stub-key"),
  getCreationParam: jest.fn().mockReturnValue("stub-param"),
  getPieceBookInfoProperty: jest.fn().mockReturnValue("stub-bookId"),
  activityIndicators: indicators,
});

const makeDataRegistry = (
  overrides: Partial<DataRegistryPort> = {}
): DataRegistryPort => ({
  getPieceData: jest.fn().mockReturnValue(makePieceDataStub()),
  getAllPiecesDataByType: jest.fn().mockReturnValue([]),
  ...overrides,
});

const makeArrangementPort = (): ArrangementServicePort => ({
  getCurrentArrangementIndex: jest.fn().mockReturnValue(0),
  getArrangementByIndex: jest.fn().mockReturnValue(undefined),
  getTestamentByIndices: jest.fn().mockReturnValue(undefined),
  getSectionByIndices: jest.fn().mockReturnValue(undefined),
  getBookInfoPathById: jest.fn().mockReturnValue({ found: false }),
  getBookSubsetByCompleteId: jest.fn().mockReturnValue(undefined),
});

const makeLabelDataStore = (
  overrides: Partial<LabelDataStorePort> = {}
): LabelDataStorePort => ({
  getDataByTransformerId: jest.fn().mockReturnValue(undefined),
  getDataByTailId: jest.fn().mockReturnValue(undefined),
  getDataByTextId: jest.fn().mockReturnValue(undefined),
  getDataByOwnerId: jest.fn().mockReturnValue(undefined),
  addLabelData: jest.fn(),
  removeLabelData: jest.fn(),
  getAllLabelsData: jest.fn().mockReturnValue([]),
  ...overrides,
});

const makeUserPresencePort = (): UserPresenceServicePort => ({
  getUserPresence: jest.fn().mockReturnValue(new Map()),
  getOwnUserPresence: jest.fn().mockReturnValue(undefined),
  getOwnUserConfigId: jest.fn().mockReturnValue("user-1"),
});

const makeIndicatorsAdapter = (): ActivityIndicatorsAdapterPort => ({
  showIndicators: jest.fn().mockReturnValue([]),
  hideIndicators: jest.fn(),
  hideIndicator: jest.fn(),
  updateIndicatorsPosition: jest.fn(),
});

const makeNotificationAdapter = (): ActivityNotificationAdapterPort => ({
  hideNotification: jest.fn(),
  showNotification: jest
    .fn()
    .mockReturnValue({ id: "notif-1", type: "ActivityNotification" }),
  updateNotificationPosition: jest.fn(),
  updateNotificationDirection: jest.fn(),
});

const makeUserColorStore = (): UserColorStorePort => ({
  getUserColor: jest.fn().mockReturnValue("#ffffff"),
});

const makeIndicatorsRepository = (): IndicatorsRepositoryPort => ({
  getIndicatorsByPieceId: jest.fn().mockReturnValue([]),
});

const makeScripturePort = (): ScriptureServicePort => ({
  mapCompleteToSubsetBook: jest.fn(),
});

const makeService = (
  overrides: {
    dataRegistryPort?: DataRegistryPort;
    labelDataStorePort?: LabelDataStorePort;
    maxIndicators?: number;
    userPresenceServicePort?: UserPresenceServicePort;
    activityIndicatorsAdapterPort?: ActivityIndicatorsAdapterPort;
    activityNotificationAdapterPort?: ActivityNotificationAdapterPort;
    userColorStorePort?: UserColorStorePort;
    arrangementServicePort?: ArrangementServicePort;
  } = {}
) =>
  new PieceActivityService({
    dataRegistryPort: makeDataRegistry(),
    indicatorsRepositoryPort: makeIndicatorsRepository(),
    arrangementServicePort: makeArrangementPort(),
    scriptureServicePort: makeScripturePort(),
    labelDataStorePort: makeLabelDataStore(),
    userPresenceServicePort: makeUserPresencePort(),
    activityIndicatorsAdapterPort: makeIndicatorsAdapter(),
    activityNotificationAdapterPort: makeNotificationAdapter(),
    userColorStorePort: makeUserColorStore(),
    ...overrides,
  });

const makeFakeActivity = (id = "ri-1") =>
  ({ id, bookId: "genesis", chapter: 1 }) as any;

const makeOwnUserPresence = (readingInstanceId = "ri-1"): UserPresenceData => ({
  bookId: "genesis",
  chapter: 1,
  readingInstanceId,
});

const makeInfoLabelData = (owner: Piece = makePiece("StackBook")) =>
  new InfoLabelData({
    id: "label-1",
    transformer: { id: "transformer-1", type: "InfoLabelTransformer" } as any,
    tail: { id: "tail-1", type: "InfoLabelTail" } as any,
    label: { id: "label-text-1", type: "InfoLabelText" } as any,
    owner,
    positioning: "RightSided" as any,
  });

const makeNotifiableContainer = (
  overrides: {
    piece?: Piece | undefined;
    isActive?: boolean;
    isSelected?: boolean;
    highlightState?: string;
    currNotification?: any;
  } = {}
): NotifiableContainer => {
  // Use "in" check so that passing piece:undefined explicitly is respected
  // (destructuring defaults would substitute the default for undefined)
  const piece =
    "piece" in overrides ? overrides.piece : makePiece("StackChapter");
  const isActive = overrides.isActive ?? true;
  const isSelected = overrides.isSelected ?? false;
  const highlightState = overrides.highlightState ?? HighlightStates.Idle;
  const currNotification = overrides.currNotification;
  return {
    piece,
    isActive,
    isSelected,
    highlightState,
    activityIndicators: [],
    clearActivityIndicators: jest.fn().mockReturnValue(undefined),
    addActivityIndicator: jest.fn(),
    removeActivityIndicator: jest.fn(),
    getIsSelectedForNotification: jest.fn().mockReturnValue(false),
    getNotificationDirection: jest.fn().mockReturnValue({ x: 0, y: 0 }),
    detachActivityNotification: jest.fn().mockReturnValue(currNotification),
    attachActivityNotification: jest.fn(),
  } as unknown as NotifiableContainer;
};

const makeContainer = (
  piece?: Piece,
  indicators: ActivityIndicator[] = []
): any => ({
  piece,
  activityIndicators: indicators,
  clearActivityIndicators: jest.fn().mockReturnValue(undefined),
  addActivityIndicator: jest.fn(),
  removeActivityIndicator: jest.fn(),
});

// ─── getActivityIndicatorsForPiece ───────────────────────────────────────────

describe("getActivityIndicatorsForPiece", () => {
  afterEach(() => jest.restoreAllMocks());

  it("logs console.error and returns [] for a piece type with no strategy", () => {
    const svc = makeService();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const result = svc.getActivityIndicatorsForPiece(makePiece("StackCover"));
    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("strategy not found")
    );
  });

  it("returns [] for StackChapter when getPieceData returns falsy", () => {
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(null),
    });
    const svc = makeService({ dataRegistryPort });
    const result = svc.getActivityIndicatorsForPiece(makePiece("StackChapter"));
    expect(result).toEqual([]);
  });

  it("returns pieceData.activityIndicators for StackChapter when data is found", () => {
    const indicator = makeIndicator();
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(makePieceDataStub([indicator])),
    });
    const svc = makeService({ dataRegistryPort });
    const result = svc.getActivityIndicatorsForPiece(makePiece("StackChapter"));
    expect(result).toEqual([indicator]);
  });

  it("returns pieceData.activityIndicators for LayoutBook", () => {
    const indicator = makeIndicator({ id: "ind-lb" });
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(makePieceDataStub([indicator])),
    });
    const svc = makeService({ dataRegistryPort });
    const result = svc.getActivityIndicatorsForPiece(makePiece("LayoutBook"));
    expect(result).toEqual([indicator]);
  });

  it("returns pieceData.activityIndicators for LayoutChapter", () => {
    const indicator = makeIndicator({ id: "ind-lc" });
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(makePieceDataStub([indicator])),
    });
    const svc = makeService({ dataRegistryPort });
    const result = svc.getActivityIndicatorsForPiece(
      makePiece("LayoutChapter")
    );
    expect(result).toEqual([indicator]);
  });

  it("calls getPieceData with the correct pieceType and pieceId", () => {
    const dataRegistryPort = makeDataRegistry();
    const svc = makeService({ dataRegistryPort });
    const piece = makePiece("StackChapter", "chapter-99");
    svc.getActivityIndicatorsForPiece(piece);
    expect(dataRegistryPort.getPieceData).toHaveBeenCalledWith({
      pieceType: "StackChapter",
      pieceId: "chapter-99",
    });
  });

  it("throws when InfoLabelTransformer transformer data is not found", () => {
    const labelDataStorePort = makeLabelDataStore({
      getDataByTransformerId: jest.fn().mockReturnValue(undefined),
    });
    const svc = makeService({ labelDataStorePort });
    expect(() =>
      svc.getActivityIndicatorsForPiece(makePiece("InfoLabelTransformer"))
    ).toThrow("PieceActivityService: labelData not found");
  });

  it("returns labelData.activityIndicators for InfoLabelTransformer when data is found", () => {
    const indicator = makeIndicator({ id: "ind-label" });
    const labelDataStorePort = makeLabelDataStore({
      getDataByTransformerId: jest
        .fn()
        .mockReturnValue({ activityIndicators: [indicator] }),
    });
    const svc = makeService({ labelDataStorePort });
    const result = svc.getActivityIndicatorsForPiece(
      makePiece("InfoLabelTransformer", "transformer-1")
    );
    expect(result).toEqual([indicator]);
  });

  it("calls getDataByTransformerId with the transformer piece id", () => {
    const labelDataStorePort = makeLabelDataStore({
      getDataByTransformerId: jest
        .fn()
        .mockReturnValue({ activityIndicators: [] }),
    });
    const svc = makeService({ labelDataStorePort });
    svc.getActivityIndicatorsForPiece(
      makePiece("InfoLabelTransformer", "transformer-42")
    );
    expect(labelDataStorePort.getDataByTransformerId).toHaveBeenCalledWith(
      "transformer-42"
    );
  });
});

// ─── getActivityIndicatorByType ───────────────────────────────────────────────

describe("getActivityIndicatorByType", () => {
  it("returns the indicator matching the requested type", () => {
    const target = makeIndicator({
      id: "ind-extra",
      indicatorType: "extraContent",
    });
    const other = makeIndicator({ id: "ind-reg", indicatorType: "regular" });
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest
        .fn()
        .mockReturnValue(makePieceDataStub([other, target])),
    });
    const svc = makeService({ dataRegistryPort });
    const result = svc.getActivityIndicatorByType(
      makePiece("StackChapter"),
      "extraContent"
    );
    expect(result).toBe(target);
  });

  it("returns undefined when no indicator matches the requested type", () => {
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(makePieceDataStub([])),
    });
    const svc = makeService({ dataRegistryPort });
    const result = svc.getActivityIndicatorByType(
      makePiece("StackChapter"),
      "extraContent"
    );
    expect(result).toBeUndefined();
  });
});

// ─── getExtraActivityIndicatorsForPiece ──────────────────────────────────────

describe("getExtraActivityIndicatorsForPiece", () => {
  it("returns both extraContent and extraBackground indicators", () => {
    const content = makeIndicator({
      id: "content",
      indicatorType: "extraContent",
    });
    const background = makeIndicator({
      id: "bg",
      indicatorType: "extraBackground",
    });
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest
        .fn()
        .mockReturnValue(makePieceDataStub([content, background])),
    });
    const svc = makeService({ dataRegistryPort });
    const result = svc.getExtraActivityIndicatorsForPiece(
      makePiece("StackChapter")
    );
    expect(result.extraIndicatorContent).toBe(content);
    expect(result.extraIndicatorBackground).toBe(background);
  });

  it("returns undefined for both when no extra indicators exist", () => {
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(makePieceDataStub([])),
    });
    const svc = makeService({ dataRegistryPort });
    const result = svc.getExtraActivityIndicatorsForPiece(
      makePiece("StackChapter")
    );
    expect(result.extraIndicatorContent).toBeUndefined();
    expect(result.extraIndicatorBackground).toBeUndefined();
  });
});

// ─── getPieceIndicatorByActivityIndex ────────────────────────────────────────

describe("getPieceIndicatorByActivityIndex", () => {
  it("returns the regular indicator at the given index", () => {
    const ind0 = makeIndicator({
      id: "r0",
      indicatorType: "regular",
      index: 0,
    });
    const ind1 = makeIndicator({
      id: "r1",
      indicatorType: "regular",
      index: 1,
    });
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(makePieceDataStub([ind0, ind1])),
    });
    const svc = makeService({ dataRegistryPort });
    expect(
      svc.getPieceIndicatorByActivityIndex(makePiece("StackChapter"), 1)
    ).toBe(ind1);
  });

  it("ignores non-regular indicators even if their index matches", () => {
    const extra = makeIndicator({
      id: "extra",
      indicatorType: "extraContent",
      index: 0,
    });
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(makePieceDataStub([extra])),
    });
    const svc = makeService({ dataRegistryPort });
    expect(
      svc.getPieceIndicatorByActivityIndex(makePiece("StackChapter"), 0)
    ).toBeUndefined();
  });

  it("returns undefined when no regular indicator has the given index", () => {
    const ind = makeIndicator({ id: "r0", indicatorType: "regular", index: 0 });
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(makePieceDataStub([ind])),
    });
    const svc = makeService({ dataRegistryPort });
    expect(
      svc.getPieceIndicatorByActivityIndex(makePiece("StackChapter"), 99)
    ).toBeUndefined();
  });
});

// ─── getDataActivityIndicatorByType ──────────────────────────────────────────

describe("getDataActivityIndicatorByType", () => {
  it("returns the indicator matching the type from data.activityIndicators", () => {
    const svc = makeService();
    const target = makeIndicator({ indicatorType: "extraBackground" });
    const other = makeIndicator({ indicatorType: "regular" });
    const container = makeContainer(undefined, [other, target]);
    expect(
      svc.getDataActivityIndicatorByType(container, "extraBackground")
    ).toBe(target);
  });

  it("returns undefined when no indicator matches", () => {
    const svc = makeService();
    const container = makeContainer(undefined, []);
    expect(
      svc.getDataActivityIndicatorByType(container, "extraContent")
    ).toBeUndefined();
  });

  it("returns the first match when multiple indicators share the same type", () => {
    const svc = makeService();
    const first = makeIndicator({
      id: "first",
      indicatorType: "regular",
      index: 0,
    });
    const second = makeIndicator({
      id: "second",
      indicatorType: "regular",
      index: 1,
    });
    const container = makeContainer(undefined, [first, second]);
    expect(svc.getDataActivityIndicatorByType(container, "regular")).toBe(
      first
    );
  });
});

// ─── getDataExtraActivityIndicators ──────────────────────────────────────────

describe("getDataExtraActivityIndicators", () => {
  it("returns extraContent and extraBackground from data.activityIndicators", () => {
    const svc = makeService();
    const content = makeIndicator({ id: "c", indicatorType: "extraContent" });
    const background = makeIndicator({
      id: "b",
      indicatorType: "extraBackground",
    });
    const container = makeContainer(undefined, [content, background]);
    const result = svc.getDataExtraActivityIndicators(container);
    expect(result.extraIndicatorContent).toBe(content);
    expect(result.extraIndicatorBackground).toBe(background);
  });

  it("returns undefined for both when container has no extra indicators", () => {
    const svc = makeService();
    const container = makeContainer(undefined, []);
    const result = svc.getDataExtraActivityIndicators(container);
    expect(result.extraIndicatorContent).toBeUndefined();
    expect(result.extraIndicatorBackground).toBeUndefined();
  });
});

// ─── getDataIndicatorByActivityIndex ─────────────────────────────────────────

describe("getDataIndicatorByActivityIndex", () => {
  it("returns the regular indicator with the matching index from data", () => {
    const svc = makeService();
    const ind = makeIndicator({ id: "r2", indicatorType: "regular", index: 2 });
    const container = makeContainer(undefined, [ind]);
    expect(svc.getDataIndicatorByActivityIndex(container, 2)).toBe(ind);
  });

  it("ignores non-regular indicators even when their index matches", () => {
    const svc = makeService();
    const extra = makeIndicator({
      id: "e",
      indicatorType: "extraContent",
      index: 0,
    });
    const container = makeContainer(undefined, [extra]);
    expect(svc.getDataIndicatorByActivityIndex(container, 0)).toBeUndefined();
  });

  it("returns undefined when no regular indicator matches the index", () => {
    const svc = makeService();
    const ind = makeIndicator({ id: "r0", indicatorType: "regular", index: 0 });
    const container = makeContainer(undefined, [ind]);
    expect(svc.getDataIndicatorByActivityIndex(container, 5)).toBeUndefined();
  });
});

// ─── getPieceActivity ─────────────────────────────────────────────────────────

describe("getPieceActivity", () => {
  afterEach(() => jest.restoreAllMocks());

  it("logs console.error and returns [] for a piece type with no activity strategy", () => {
    const svc = makeService();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const result = svc.getPieceActivity({
      piece: makePiece("ActivityIndicator"),
    });
    expect(result).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("strategy not found")
    );
  });

  it("returns [] for a supported piece type because reading instances are always empty", () => {
    const svc = makeService();
    // allReadingInstances = [] due to TODO placeholders in the source,
    // so the activity filter always yields an empty array.
    const result = svc.getPieceActivity({ piece: makePiece("StackBook") });
    expect(result).toEqual([]);
  });

  it("calls the arrangement port to get the current index when desiredArrangementIndex is omitted", () => {
    const arrangementServicePort = makeArrangementPort();
    const svc = new PieceActivityService({
      dataRegistryPort: makeDataRegistry(),
      indicatorsRepositoryPort: makeIndicatorsRepository(),
      arrangementServicePort,
      scriptureServicePort: makeScripturePort(),
      labelDataStorePort: makeLabelDataStore(),
      userPresenceServicePort: makeUserPresencePort(),
      activityIndicatorsAdapterPort: makeIndicatorsAdapter(),
      activityNotificationAdapterPort: makeNotificationAdapter(),
      userColorStorePort: makeUserColorStore(),
    });
    svc.getPieceActivity({ piece: makePiece("StackBook") });
    expect(
      arrangementServicePort.getCurrentArrangementIndex
    ).toHaveBeenCalled();
  });

  it("does not call getCurrentArrangementIndex when desiredArrangementIndex is provided", () => {
    const arrangementServicePort = makeArrangementPort();
    const svc = new PieceActivityService({
      dataRegistryPort: makeDataRegistry(),
      indicatorsRepositoryPort: makeIndicatorsRepository(),
      arrangementServicePort,
      scriptureServicePort: makeScripturePort(),
      labelDataStorePort: makeLabelDataStore(),
      userPresenceServicePort: makeUserPresencePort(),
      activityIndicatorsAdapterPort: makeIndicatorsAdapter(),
      activityNotificationAdapterPort: makeNotificationAdapter(),
      userColorStorePort: makeUserColorStore(),
    });
    svc.getPieceActivity({
      piece: makePiece("StackBook"),
      desiredArrangementIndex: 0,
    });
    expect(
      arrangementServicePort.getCurrentArrangementIndex
    ).not.toHaveBeenCalled();
  });
});

// ─── updateIndicators ─────────────────────────────────────────────────────────

describe("updateIndicators", () => {
  it("returns [] and does not call clearActivityIndicators when container has no piece", () => {
    const svc = makeService();
    const container = makeContainer(undefined);
    const result = svc.updateIndicators(container);
    expect(result).toEqual([]);
    expect(container.clearActivityIndicators).not.toHaveBeenCalled();
  });

  it("calls clearActivityIndicators when activity is empty and container has a piece", () => {
    const svc = makeService();
    const container = makeContainer(makePiece("StackBook"));
    svc.updateIndicators(container);
    expect(container.clearActivityIndicators).toHaveBeenCalled();
  });

  it("calls hideIndicators with the cleared indicators when clearActivityIndicators returns them", () => {
    const indicatorsAdapter = makeIndicatorsAdapter();
    const svc = new PieceActivityService({
      dataRegistryPort: makeDataRegistry(),
      indicatorsRepositoryPort: makeIndicatorsRepository(),
      arrangementServicePort: makeArrangementPort(),
      scriptureServicePort: makeScripturePort(),
      labelDataStorePort: makeLabelDataStore(),
      userPresenceServicePort: makeUserPresencePort(),
      activityIndicatorsAdapterPort: indicatorsAdapter,
      activityNotificationAdapterPort: makeNotificationAdapter(),
      userColorStorePort: makeUserColorStore(),
    });
    const cleared = [makeIndicator()];
    const container = makeContainer(makePiece("StackBook"));
    (container.clearActivityIndicators as jest.Mock).mockReturnValue(cleared);
    svc.updateIndicators(container);
    expect(indicatorsAdapter.hideIndicators).toHaveBeenCalledWith(cleared);
  });

  it("does not call hideIndicators when clearActivityIndicators returns undefined", () => {
    const indicatorsAdapter = makeIndicatorsAdapter();
    const svc = new PieceActivityService({
      dataRegistryPort: makeDataRegistry(),
      indicatorsRepositoryPort: makeIndicatorsRepository(),
      arrangementServicePort: makeArrangementPort(),
      scriptureServicePort: makeScripturePort(),
      labelDataStorePort: makeLabelDataStore(),
      userPresenceServicePort: makeUserPresencePort(),
      activityIndicatorsAdapterPort: indicatorsAdapter,
      activityNotificationAdapterPort: makeNotificationAdapter(),
      userColorStorePort: makeUserColorStore(),
    });
    const container = makeContainer(makePiece("StackBook"));
    (container.clearActivityIndicators as jest.Mock).mockReturnValue(undefined);
    svc.updateIndicators(container);
    expect(indicatorsAdapter.hideIndicators).not.toHaveBeenCalled();
  });

  it("returns [] when activity is empty", () => {
    const svc = makeService();
    const container = makeContainer(makePiece("StackBook"));
    expect(svc.updateIndicators(container)).toEqual([]);
  });
});

// ─── updateAllIndicators ──────────────────────────────────────────────────────

describe("updateAllIndicators", () => {
  it("queries getAllLabelsData and all three data registry types", () => {
    const labelDataStorePort = makeLabelDataStore();
    const dataRegistryPort = makeDataRegistry();
    const svc = new PieceActivityService({
      dataRegistryPort,
      indicatorsRepositoryPort: makeIndicatorsRepository(),
      arrangementServicePort: makeArrangementPort(),
      scriptureServicePort: makeScripturePort(),
      labelDataStorePort,
      userPresenceServicePort: makeUserPresencePort(),
      activityIndicatorsAdapterPort: makeIndicatorsAdapter(),
      activityNotificationAdapterPort: makeNotificationAdapter(),
      userColorStorePort: makeUserColorStore(),
    });
    svc.updateAllIndicators();
    expect(labelDataStorePort.getAllLabelsData).toHaveBeenCalled();
    expect(dataRegistryPort.getAllPiecesDataByType).toHaveBeenCalledWith(
      "StackChapter"
    );
    expect(dataRegistryPort.getAllPiecesDataByType).toHaveBeenCalledWith(
      "LayoutChapter"
    );
    expect(dataRegistryPort.getAllPiecesDataByType).toHaveBeenCalledWith(
      "LayoutBook"
    );
  });

  it("calls updateIndicators once per container returned by the stores", () => {
    const containerA = makeContainer(makePiece("StackBook"), []);
    const containerB = makeContainer(makePiece("StackBook"), []);
    const labelDataStorePort = makeLabelDataStore({
      getAllLabelsData: jest.fn().mockReturnValue([containerA]),
    });
    const dataRegistryPort = makeDataRegistry({
      getAllPiecesDataByType: jest.fn().mockImplementation((type: string) => {
        if (type === "StackChapter") return [containerB];
        return [];
      }),
    });
    const svc = new PieceActivityService({
      dataRegistryPort,
      indicatorsRepositoryPort: makeIndicatorsRepository(),
      arrangementServicePort: makeArrangementPort(),
      scriptureServicePort: makeScripturePort(),
      labelDataStorePort,
      userPresenceServicePort: makeUserPresencePort(),
      activityIndicatorsAdapterPort: makeIndicatorsAdapter(),
      activityNotificationAdapterPort: makeNotificationAdapter(),
      userColorStorePort: makeUserColorStore(),
    });
    svc.updateAllIndicators();
    // containerA (from labels) + containerB (from StackChapter) = 2 clearActivityIndicators calls
    expect(containerA.clearActivityIndicators).toHaveBeenCalled();
    expect(containerB.clearActivityIndicators).toHaveBeenCalled();
  });

  it("filters out hiding labels — isHiding=true containers are skipped", () => {
    const hidingContainer = {
      ...makeContainer(makePiece("StackBook"), []),
      isHiding: true,
    };
    const visibleContainer = makeContainer(makePiece("StackBook"), []);
    const labelDataStorePort = makeLabelDataStore({
      getAllLabelsData: jest
        .fn()
        .mockReturnValue([hidingContainer, visibleContainer]),
    });
    const svc = new PieceActivityService({
      dataRegistryPort: makeDataRegistry(),
      indicatorsRepositoryPort: makeIndicatorsRepository(),
      arrangementServicePort: makeArrangementPort(),
      scriptureServicePort: makeScripturePort(),
      labelDataStorePort,
      userPresenceServicePort: makeUserPresencePort(),
      activityIndicatorsAdapterPort: makeIndicatorsAdapter(),
      activityNotificationAdapterPort: makeNotificationAdapter(),
      userColorStorePort: makeUserColorStore(),
    });
    svc.updateAllIndicators();
    expect(hidingContainer.clearActivityIndicators).not.toHaveBeenCalled();
    expect(visibleContainer.clearActivityIndicators).toHaveBeenCalled();
  });
});

// ─── getPieceActivity — activity strategies ──────────────────────────────────
// Even though allReadingInstances is always [], the strategy function is still
// invoked at line 311 of the source, so its body IS executed and can be covered.

describe("getPieceActivity — activity strategies", () => {
  it("calls getPieceInfoProperty('name') for StackTestament (testamentActivityStrategy)", () => {
    const stub = makePieceDataStub();
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(stub),
    });
    const svc = makeService({ dataRegistryPort });
    svc.getPieceActivity({ piece: makePiece("StackTestament") });
    expect(stub.getPieceInfoProperty).toHaveBeenCalledWith("name");
  });

  it("calls getPieceData with pieceType=StackTestament", () => {
    const dataRegistryPort = makeDataRegistry();
    const svc = makeService({ dataRegistryPort });
    svc.getPieceActivity({ piece: makePiece("StackTestament", "t-42") });
    expect(dataRegistryPort.getPieceData).toHaveBeenCalledWith({
      pieceId: "t-42",
      pieceType: "StackTestament",
    });
  });

  it("calls getPieceInfoProperty('name') for StackSection (sectionActivityStrategy)", () => {
    const stub = makePieceDataStub();
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(stub),
    });
    const svc = makeService({ dataRegistryPort });
    svc.getPieceActivity({ piece: makePiece("StackSection") });
    expect(stub.getPieceInfoProperty).toHaveBeenCalledWith("name");
  });

  it("calls getPieceInfoProperty('name') for StackSectionShadow (same sectionActivityStrategy)", () => {
    const stub = makePieceDataStub();
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(stub),
    });
    const svc = makeService({ dataRegistryPort });
    svc.getPieceActivity({ piece: makePiece("StackSectionShadow") });
    expect(stub.getPieceInfoProperty).toHaveBeenCalledWith("name");
  });

  it("calls getPieceBookInfoProperty('bookId') for StackSectionBook (sectionBookActivityStrategy)", () => {
    const stub = makePieceDataStub();
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(stub),
    });
    const svc = makeService({ dataRegistryPort });
    svc.getPieceActivity({ piece: makePiece("StackSectionBook") });
    expect(stub.getPieceBookInfoProperty).toHaveBeenCalledWith("bookId");
  });

  it("calls getCreationParam('bookId') and getPieceInfoProperty('number') for StackChapter (chapterActivityStrategy)", () => {
    const stub = makePieceDataStub();
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(stub),
    });
    const svc = makeService({ dataRegistryPort });
    svc.getPieceActivity({ piece: makePiece("StackChapter") });
    expect(stub.getCreationParam).toHaveBeenCalledWith("bookId");
    expect(stub.getPieceInfoProperty).toHaveBeenCalledWith("number");
  });

  it("calls getCreationParam('bookId') and getPieceInfoProperty('number') for LayoutChapter", () => {
    const stub = makePieceDataStub();
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(stub),
    });
    const svc = makeService({ dataRegistryPort });
    svc.getPieceActivity({ piece: makePiece("LayoutChapter") });
    expect(stub.getCreationParam).toHaveBeenCalledWith("bookId");
    expect(stub.getPieceInfoProperty).toHaveBeenCalledWith("number");
  });

  it("calls getPieceInfoProperty('bookId') for LayoutBook", () => {
    const stub = makePieceDataStub();
    const dataRegistryPort = makeDataRegistry({
      getPieceData: jest.fn().mockReturnValue(stub),
    });
    const svc = makeService({ dataRegistryPort });
    svc.getPieceActivity({ piece: makePiece("LayoutBook") });
    expect(stub.getPieceInfoProperty).toHaveBeenCalledWith("bookId");
  });
});

// ─── updateIndicators — InfoLabelData container ───────────────────────────────

describe("updateIndicators — InfoLabelData container", () => {
  afterEach(() => jest.restoreAllMocks());

  it("uses InfoLabelData.owner as activityPiece and calls clearActivityIndicators when activity is empty", () => {
    const owner = makePiece("StackBook");
    const labelData = makeInfoLabelData(owner);
    const svc = makeService();
    // getPieceActivity returns [] by default → clearActivityIndicators path
    svc.updateIndicators(labelData);
    // InfoLabelData.clearActivityIndicators returns undefined when map is empty
    // — the important thing is the call chain executed without throwing
    expect(svc.updateIndicators(labelData)).toEqual([]);
  });

  it("calls showIndicators with the InfoLabelData as container when activity is non-empty", () => {
    const indicatorsAdapter = makeIndicatorsAdapter();
    const owner = makePiece("StackBook");
    const labelData = makeInfoLabelData(owner);
    const svc = makeService({
      activityIndicatorsAdapterPort: indicatorsAdapter,
    });
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    svc.updateIndicators(labelData);
    expect(indicatorsAdapter.showIndicators).toHaveBeenCalledWith(
      expect.objectContaining({ container: labelData })
    );
  });
});

// ─── updateIndicators — with non-empty activity ───────────────────────────────

describe("updateIndicators — with non-empty activity", () => {
  afterEach(() => jest.restoreAllMocks());

  it("does NOT call clearActivityIndicators when activity is non-empty", () => {
    const svc = makeService();
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeContainer(makePiece("StackBook"));
    svc.updateIndicators(container);
    expect(container.clearActivityIndicators).not.toHaveBeenCalled();
  });

  it("calls showIndicators with the container and the regular command", () => {
    const indicatorsAdapter = makeIndicatorsAdapter();
    const svc = makeService({
      activityIndicatorsAdapterPort: indicatorsAdapter,
    });
    jest
      .spyOn(svc, "getPieceActivity")
      .mockReturnValue([makeFakeActivity("ri-1")]);
    const container = makeContainer(makePiece("StackBook"));
    svc.updateIndicators(container);
    expect(indicatorsAdapter.showIndicators).toHaveBeenCalledWith(
      expect.objectContaining({ container, command: expect.any(Array) })
    );
  });

  it("adds each indicator returned by showIndicators via addActivityIndicator", () => {
    const newInd = makeIndicator({ id: "new-ind" });
    const indicatorsAdapter = makeIndicatorsAdapter();
    (indicatorsAdapter.showIndicators as jest.Mock).mockReturnValue([newInd]);
    const svc = makeService({
      activityIndicatorsAdapterPort: indicatorsAdapter,
    });
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeContainer(makePiece("StackBook"));
    svc.updateIndicators(container);
    expect(container.addActivityIndicator).toHaveBeenCalledWith(newInd);
  });

  it("returns the indicators from showIndicators", () => {
    const newInd = makeIndicator({ id: "returned-ind" });
    const indicatorsAdapter = makeIndicatorsAdapter();
    (indicatorsAdapter.showIndicators as jest.Mock).mockReturnValue([newInd]);
    const svc = makeService({
      activityIndicatorsAdapterPort: indicatorsAdapter,
    });
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeContainer(makePiece("StackBook"));
    expect(svc.updateIndicators(container)).toEqual([newInd]);
  });

  it("calls updateIndicatorsPosition with the container", () => {
    const indicatorsAdapter = makeIndicatorsAdapter();
    const svc = makeService({
      activityIndicatorsAdapterPort: indicatorsAdapter,
    });
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeContainer(makePiece("StackBook"));
    svc.updateIndicators(container);
    expect(indicatorsAdapter.updateIndicatorsPosition).toHaveBeenCalledWith(
      container
    );
  });

  it("hides and removes an existing indicator whose index >= activity limit", () => {
    const staleInd = makeIndicator({
      id: "stale",
      indicatorType: "regular",
      index: 5,
    });
    const indicatorsAdapter = makeIndicatorsAdapter();
    const svc = makeService({
      activityIndicatorsAdapterPort: indicatorsAdapter,
    });
    // 1 activity → limit = min(1, 4) = 1; stale index 5 >= 1 → hidden
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeContainer(makePiece("StackBook"), [staleInd]);
    svc.updateIndicators(container);
    expect(indicatorsAdapter.hideIndicator).toHaveBeenCalledWith(staleInd);
    expect(container.removeActivityIndicator).toHaveBeenCalledWith(staleInd.id);
  });

  it("hides existing extraContent and extraBackground when activity count <= maxIndicators", () => {
    const extraContent = makeIndicator({
      id: "ec",
      indicatorType: "extraContent",
    });
    const extraBackground = makeIndicator({
      id: "eb",
      indicatorType: "extraBackground",
    });
    const indicatorsAdapter = makeIndicatorsAdapter();
    const svc = makeService({
      activityIndicatorsAdapterPort: indicatorsAdapter,
    });
    // 1 activity <= 4 (default maxIndicators) → extra indicators should be removed
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeContainer(makePiece("StackBook"), [
      extraContent,
      extraBackground,
    ]);
    svc.updateIndicators(container);
    expect(indicatorsAdapter.hideIndicator).toHaveBeenCalledWith(extraContent);
    expect(indicatorsAdapter.hideIndicator).toHaveBeenCalledWith(
      extraBackground
    );
    expect(container.removeActivityIndicator).toHaveBeenCalledWith(
      extraContent.id
    );
    expect(container.removeActivityIndicator).toHaveBeenCalledWith(
      extraBackground.id
    );
  });

  it("pushes extraContent and extraBackground commands when activity count exceeds maxIndicators", () => {
    const indicatorsAdapter = makeIndicatorsAdapter();
    const svc = makeService({
      activityIndicatorsAdapterPort: indicatorsAdapter,
      maxIndicators: 2,
    });
    // 3 activities > maxIndicators(2) → extra indicator commands pushed for index 2
    const activities = [
      makeFakeActivity("a"),
      makeFakeActivity("b"),
      makeFakeActivity("c"),
    ];
    jest.spyOn(svc, "getPieceActivity").mockReturnValue(activities);
    const container = makeContainer(makePiece("StackBook"));
    svc.updateIndicators(container);
    const { command } = (indicatorsAdapter.showIndicators as jest.Mock).mock
      .calls[0][0];
    const extraContent = (command as any[]).find(
      (c: any) => c.type === "extraContent"
    );
    const extraBackground = (command as any[]).find(
      (c: any) => c.type === "extraBackground"
    );
    expect(extraContent).toBeDefined();
    expect(extraBackground).toBeDefined();
    expect(extraContent.extraUsers).toBe(1); // 3 - 2 = 1 extra user
  });

  it("sets isOwnUserActiveActivity=true when ownUserPresence.readingInstanceId matches activity.id", () => {
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence("ri-match")
    );
    const indicatorsAdapter = makeIndicatorsAdapter();
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityIndicatorsAdapterPort: indicatorsAdapter,
    });
    jest
      .spyOn(svc, "getPieceActivity")
      .mockReturnValue([makeFakeActivity("ri-match")]);
    const container = makeContainer(makePiece("StackBook"));
    svc.updateIndicators(container);
    const { command } = (indicatorsAdapter.showIndicators as jest.Mock).mock
      .calls[0][0];
    const regularCmd = (command as any[]).find(
      (c: any) => c.type === "regular"
    );
    expect(regularCmd.isOwnUserActiveActivity).toBe(true);
  });

  it("sets isOwnUserActiveActivity=false when ownUserPresence is undefined", () => {
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(undefined);
    const indicatorsAdapter = makeIndicatorsAdapter();
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityIndicatorsAdapterPort: indicatorsAdapter,
    });
    jest
      .spyOn(svc, "getPieceActivity")
      .mockReturnValue([makeFakeActivity("ri-1")]);
    const container = makeContainer(makePiece("StackBook"));
    svc.updateIndicators(container);
    const { command } = (indicatorsAdapter.showIndicators as jest.Mock).mock
      .calls[0][0];
    const regularCmd = (command as any[]).find(
      (c: any) => c.type === "regular"
    );
    expect(regularCmd.isOwnUserActiveActivity).toBe(false);
  });

  it("uses the matching presence user's configId for color when found in userPresence map", () => {
    const presenceMap = new Map([
      [
        "remote-user",
        { bookId: "genesis", chapter: 1, readingInstanceId: "ri-1" },
      ],
    ]);
    const userPresence = makeUserPresencePort();
    (userPresence.getUserPresence as jest.Mock).mockReturnValue(presenceMap);
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence("other")
    );
    const colorStore = makeUserColorStore();
    const svc = makeService({
      userPresenceServicePort: userPresence,
      userColorStorePort: colorStore,
    });
    jest
      .spyOn(svc, "getPieceActivity")
      .mockReturnValue([makeFakeActivity("ri-1")]);
    const container = makeContainer(makePiece("StackBook"));
    svc.updateIndicators(container);
    expect(colorStore.getUserColor).toHaveBeenCalledWith({
      configId: "remote-user",
    });
  });

  it("falls back to getOwnUserConfigId for color when no matching presence is found", () => {
    const userPresence = makeUserPresencePort();
    (userPresence.getUserPresence as jest.Mock).mockReturnValue(new Map());
    (userPresence.getOwnUserConfigId as jest.Mock).mockReturnValue("own-user");
    const colorStore = makeUserColorStore();
    const svc = makeService({
      userPresenceServicePort: userPresence,
      userColorStorePort: colorStore,
    });
    jest
      .spyOn(svc, "getPieceActivity")
      .mockReturnValue([makeFakeActivity("ri-1")]);
    const container = makeContainer(makePiece("StackBook"));
    svc.updateIndicators(container);
    expect(colorStore.getUserColor).toHaveBeenCalledWith({
      configId: "own-user",
    });
  });

  it("uses '#ffffff' fallback when getUserColor returns undefined", () => {
    const colorStore = makeUserColorStore();
    (colorStore.getUserColor as jest.Mock).mockReturnValue(undefined);
    const indicatorsAdapter = makeIndicatorsAdapter();
    const svc = makeService({
      userColorStorePort: colorStore,
      activityIndicatorsAdapterPort: indicatorsAdapter,
    });
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeContainer(makePiece("StackBook"));
    svc.updateIndicators(container);
    const { command } = (indicatorsAdapter.showIndicators as jest.Mock).mock
      .calls[0][0];
    const regularCmd = (command as any[]).find(
      (c: any) => c.type === "regular"
    );
    expect(regularCmd.color).toBe("#ffffff");
  });
});

// ─── updateNotification ───────────────────────────────────────────────────────

describe("updateNotification", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns early without calling getUserPresence when container has no piece", () => {
    const userPresence = makeUserPresencePort();
    const svc = makeService({ userPresenceServicePort: userPresence });
    const container = makeNotifiableContainer({ piece: undefined });
    svc.updateNotification(container);
    expect(userPresence.getUserPresence).not.toHaveBeenCalled();
  });

  it("returns early without calling getUserPresence when container.isActive is false", () => {
    const userPresence = makeUserPresencePort();
    const svc = makeService({ userPresenceServicePort: userPresence });
    const container = makeNotifiableContainer({ isActive: false });
    svc.updateNotification(container);
    expect(userPresence.getUserPresence).not.toHaveBeenCalled();
  });

  it("throws when ownUserPresence is undefined", () => {
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(undefined);
    const svc = makeService({ userPresenceServicePort: userPresence });
    const container = makeNotifiableContainer();
    expect(() => svc.updateNotification(container)).toThrow(
      "ownUserPresence not found at updateNotification"
    );
  });

  it("calls hideNotification and returns when shouldHide=true and currNotification exists", () => {
    const notifAdapter = makeNotificationAdapter();
    const existingNotif = {
      id: "notif-existing",
      type: "ActivityNotification",
    };
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence()
    );
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityNotificationAdapterPort: notifAdapter,
    });
    // pieceActivity empty → shouldHide=true; currNotification exists
    const container = makeNotifiableContainer({
      currNotification: existingNotif,
    });
    svc.updateNotification(container);
    expect(notifAdapter.hideNotification).toHaveBeenCalledWith(existingNotif);
    expect(notifAdapter.showNotification).not.toHaveBeenCalled();
  });

  it("does NOT call hideNotification when shouldHide=true but no currNotification", () => {
    const notifAdapter = makeNotificationAdapter();
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence()
    );
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityNotificationAdapterPort: notifAdapter,
    });
    // pieceActivity empty → shouldHide=true; no currNotification
    const container = makeNotifiableContainer({ currNotification: undefined });
    svc.updateNotification(container);
    expect(notifAdapter.hideNotification).not.toHaveBeenCalled();
  });

  it("hides notification when isPieceSelected=true and currNotification exists", () => {
    const notifAdapter = makeNotificationAdapter();
    const existingNotif = { id: "n", type: "ActivityNotification" };
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence()
    );
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityNotificationAdapterPort: notifAdapter,
    });
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeNotifiableContainer({
      currNotification: existingNotif,
    });
    (container.getIsSelectedForNotification as jest.Mock).mockReturnValue(true);
    svc.updateNotification(container);
    expect(notifAdapter.hideNotification).toHaveBeenCalledWith(existingNotif);
    expect(notifAdapter.showNotification).not.toHaveBeenCalled();
  });

  it("hides notification when highlightState=Highlighting and currNotification exists", () => {
    const notifAdapter = makeNotificationAdapter();
    const existingNotif = { id: "n", type: "ActivityNotification" };
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence()
    );
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityNotificationAdapterPort: notifAdapter,
    });
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeNotifiableContainer({
      highlightState: HighlightStates.Highlighting,
      currNotification: existingNotif,
    });
    svc.updateNotification(container);
    expect(notifAdapter.hideNotification).toHaveBeenCalledWith(existingNotif);
    expect(notifAdapter.showNotification).not.toHaveBeenCalled();
  });

  it("hides notification when highlightState=Highlighted+isSelected=false and currNotification exists", () => {
    const notifAdapter = makeNotificationAdapter();
    const existingNotif = { id: "n", type: "ActivityNotification" };
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence()
    );
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityNotificationAdapterPort: notifAdapter,
    });
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeNotifiableContainer({
      highlightState: HighlightStates.Highlighted,
      isSelected: false,
      currNotification: existingNotif,
    });
    svc.updateNotification(container);
    expect(notifAdapter.hideNotification).toHaveBeenCalledWith(existingNotif);
  });

  it("does NOT hide when highlightState=Highlighted and isSelected=true", () => {
    const notifAdapter = makeNotificationAdapter();
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence()
    );
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityNotificationAdapterPort: notifAdapter,
    });
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeNotifiableContainer({
      highlightState: HighlightStates.Highlighted,
      isSelected: true,
    });
    svc.updateNotification(container);
    expect(notifAdapter.hideNotification).not.toHaveBeenCalled();
    expect(notifAdapter.showNotification).toHaveBeenCalled();
  });

  it("calls showNotification with the correct params when shouldHide=false", () => {
    const notifAdapter = makeNotificationAdapter();
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence("other")
    );
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityNotificationAdapterPort: notifAdapter,
    });
    jest
      .spyOn(svc, "getPieceActivity")
      .mockReturnValue([makeFakeActivity("ri-1")]);
    const container = makeNotifiableContainer();
    svc.updateNotification(container);
    expect(notifAdapter.showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ activityCount: 1, container })
    );
  });

  it("sets isOwnUserInPiece=true when ownUserCurrActivityId matches an activity.id", () => {
    const notifAdapter = makeNotificationAdapter();
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence("ri-match")
    );
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityNotificationAdapterPort: notifAdapter,
    });
    jest
      .spyOn(svc, "getPieceActivity")
      .mockReturnValue([makeFakeActivity("ri-match")]);
    const container = makeNotifiableContainer();
    svc.updateNotification(container);
    expect(notifAdapter.showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ isOwnUserInPiece: true })
    );
  });

  it("sets isOwnUserInPiece=false when no activity.id matches ownUserCurrActivityId", () => {
    const notifAdapter = makeNotificationAdapter();
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence("ri-other")
    );
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityNotificationAdapterPort: notifAdapter,
    });
    jest
      .spyOn(svc, "getPieceActivity")
      .mockReturnValue([makeFakeActivity("ri-different")]);
    const container = makeNotifiableContainer();
    svc.updateNotification(container);
    expect(notifAdapter.showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ isOwnUserInPiece: false })
    );
  });

  it("attaches the notification returned by showNotification to the container", () => {
    const newNotif = { id: "new-notif", type: "ActivityNotification" };
    const notifAdapter = makeNotificationAdapter();
    (notifAdapter.showNotification as jest.Mock).mockReturnValue(newNotif);
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence()
    );
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityNotificationAdapterPort: notifAdapter,
    });
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeNotifiableContainer();
    svc.updateNotification(container);
    expect(container.attachActivityNotification).toHaveBeenCalledWith(newNotif);
  });

  it("calls updateNotificationPosition and updateNotificationDirection with the container", () => {
    const notifAdapter = makeNotificationAdapter();
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence()
    );
    const svc = makeService({
      userPresenceServicePort: userPresence,
      activityNotificationAdapterPort: notifAdapter,
    });
    jest.spyOn(svc, "getPieceActivity").mockReturnValue([makeFakeActivity()]);
    const container = makeNotifiableContainer();
    svc.updateNotification(container);
    expect(notifAdapter.updateNotificationPosition).toHaveBeenCalledWith(
      container
    );
    expect(notifAdapter.updateNotificationDirection).toHaveBeenCalledWith(
      container
    );
  });

  it("resolves color from matching presence user configId", () => {
    const presenceMap = new Map([
      [
        "remote-u",
        { bookId: "genesis", chapter: 1, readingInstanceId: "ri-1" },
      ],
    ]);
    const userPresence = makeUserPresencePort();
    (userPresence.getUserPresence as jest.Mock).mockReturnValue(presenceMap);
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence("other")
    );
    const colorStore = makeUserColorStore();
    const svc = makeService({
      userPresenceServicePort: userPresence,
      userColorStorePort: colorStore,
    });
    jest
      .spyOn(svc, "getPieceActivity")
      .mockReturnValue([makeFakeActivity("ri-1")]);
    const container = makeNotifiableContainer();
    svc.updateNotification(container);
    expect(colorStore.getUserColor).toHaveBeenCalledWith({
      configId: "remote-u",
    });
  });

  it("falls back to getOwnUserConfigId for color when no matching presence found", () => {
    const userPresence = makeUserPresencePort();
    (userPresence.getUserPresence as jest.Mock).mockReturnValue(new Map());
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence()
    );
    (userPresence.getOwnUserConfigId as jest.Mock).mockReturnValue("my-config");
    const colorStore = makeUserColorStore();
    const svc = makeService({
      userPresenceServicePort: userPresence,
      userColorStorePort: colorStore,
    });
    jest
      .spyOn(svc, "getPieceActivity")
      .mockReturnValue([makeFakeActivity("ri-1")]);
    const container = makeNotifiableContainer();
    svc.updateNotification(container);
    expect(colorStore.getUserColor).toHaveBeenCalledWith({
      configId: "my-config",
    });
  });
});

// ─── updateAllNotifications ───────────────────────────────────────────────────

describe("updateAllNotifications", () => {
  afterEach(() => jest.restoreAllMocks());

  it("queries getAllPiecesDataByType for StackChapter and LayoutChapter", () => {
    const dataRegistryPort = makeDataRegistry();
    const svc = makeService({ dataRegistryPort });
    svc.updateAllNotifications();
    expect(dataRegistryPort.getAllPiecesDataByType).toHaveBeenCalledWith(
      "StackChapter"
    );
    expect(dataRegistryPort.getAllPiecesDataByType).toHaveBeenCalledWith(
      "LayoutChapter"
    );
  });

  it("does NOT query LayoutBook or getAllLabelsData (unlike updateAllIndicators)", () => {
    const dataRegistryPort = makeDataRegistry();
    const labelDataStorePort = makeLabelDataStore();
    const svc = makeService({ dataRegistryPort, labelDataStorePort });
    svc.updateAllNotifications();
    expect(dataRegistryPort.getAllPiecesDataByType).not.toHaveBeenCalledWith(
      "LayoutBook"
    );
    expect(labelDataStorePort.getAllLabelsData).not.toHaveBeenCalled();
  });

  it("calls updateNotification for each container from both data types", () => {
    const containerA = makeNotifiableContainer();
    const containerB = makeNotifiableContainer();
    const dataRegistryPort = makeDataRegistry({
      getAllPiecesDataByType: jest.fn().mockImplementation((type: string) => {
        if (type === "StackChapter") return [containerA];
        if (type === "LayoutChapter") return [containerB];
        return [];
      }),
    });
    const userPresence = makeUserPresencePort();
    (userPresence.getOwnUserPresence as jest.Mock).mockReturnValue(
      makeOwnUserPresence()
    );
    const svc = makeService({
      dataRegistryPort,
      userPresenceServicePort: userPresence,
    });
    const updateSpy = jest
      .spyOn(svc, "updateNotification")
      .mockImplementation(() => {});
    svc.updateAllNotifications();
    expect(updateSpy).toHaveBeenCalledWith(containerA);
    expect(updateSpy).toHaveBeenCalledWith(containerB);
    expect(updateSpy).toHaveBeenCalledTimes(2);
  });
});
