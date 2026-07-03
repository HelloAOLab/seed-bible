import { PieceLabelService } from "bibleVizUtils.application.services.PieceLabelService";
import { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import type {
  LabelAdapterPort,
  LabelDateFormatServicePort,
  IdGeneratorPort,
  LabelStrategy,
  PieceActivityServicePort,
  LabelFeedbackAdapterPort,
} from "bibleVizUtils.domain.ports.label";
import type { LabelDataStorePort } from "bibleVizUtils.domain.ports.piece";
import type { ActivityIndicatorsAdapterPort } from "bibleVizUtils.domain.ports.pieceActivity";
import type {
  Piece,
  ActivityIndicator,
} from "bibleVizUtils.domain.models.canvas";
import { LabelPosition } from "bibleVizUtils.domain.models.label";

// ─── factories ────────────────────────────────────────────────────────────────

const makePiece = <T extends Piece["type"]>(
  type: T,
  id = `${type}-1`
): Piece<T> => ({ id, type }) as Piece<T>;

const makeIndicator = (
  overrides: Partial<ActivityIndicator> = {}
): ActivityIndicator => ({
  id: "ind-1",
  type: "ActivityIndicator",
  indicatorType: "regular",
  index: 0,
  ...overrides,
});

const makeSpawnResult = () => ({
  transformer: makePiece("InfoLabelTransformer", "transformer-1"),
  tail: makePiece("InfoLabelTail", "tail-1"),
  label: makePiece("InfoLabelText", "text-1"),
  date: undefined as Piece<"InfoLabelDate"> | undefined,
});

const makeLabelAdapter = (
  overrides: Partial<LabelAdapterPort> = {}
): LabelAdapterPort => ({
  spawnLabel: jest.fn().mockReturnValue(makeSpawnResult()),
  despawnLabel: jest.fn(),
  ...overrides,
});

const makeLabelDataStore = (
  overrides: Partial<LabelDataStorePort> = {}
): LabelDataStorePort => ({
  getDataByOwnerId: jest.fn().mockReturnValue(undefined),
  getDataByTransformerId: jest.fn().mockReturnValue(undefined),
  getDataByTailId: jest.fn().mockReturnValue(undefined),
  getDataByTextId: jest.fn().mockReturnValue(undefined),
  addLabelData: jest.fn(),
  removeLabelData: jest.fn(),
  getAllLabelsData: jest.fn().mockReturnValue([]),
  ...overrides,
});

const makeActivityPort = (): PieceActivityServicePort => ({
  updateIndicators: jest.fn().mockReturnValue([]),
});

const makeStrategy = (
  overrides: Partial<LabelStrategy<Piece<"StackBook">>> = {}
): LabelStrategy<Piece<"StackBook">> => ({
  getLabel: jest.fn().mockReturnValue("Genesis"),
  getDate: jest.fn().mockReturnValue(undefined),
  getColor: jest.fn().mockReturnValue("#ffffff"),
  getLabelColor: jest.fn().mockReturnValue("#000000"),
  labelPositioning: LabelPosition.RightSided,
  isInteractable: false,
  makesAttentionFeedback: false,
  ...overrides,
});

const makeDateFormatPort = (): LabelDateFormatServicePort => ({
  dateFormat: "Absolute",
});

const makeIdPort = (): IdGeneratorPort => ({
  getId: jest.fn().mockReturnValue("label-id-1"),
});

const makeIndicatorsAdapter = (): ActivityIndicatorsAdapterPort => ({
  showIndicators: jest.fn().mockReturnValue([]),
  hideIndicators: jest.fn(),
  hideIndicator: jest.fn(),
  updateIndicatorsPosition: jest.fn(),
});

const makeAnimationAdapter = (
  overrides: Partial<LabelFeedbackAdapterPort> = {}
): LabelFeedbackAdapterPort => ({
  displayAttentionFeedback: jest.fn(),
  stopAttentionFeedback: jest.fn(),
  displayShowFeedback: jest.fn().mockResolvedValue(undefined),
  displayHideFeedback: jest.fn().mockResolvedValue(undefined),
  displayChangedIntensityFeedback: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

type TestType = "StackBook";

const makeService = (
  overrides: {
    labelAdapterPort?: LabelAdapterPort;
    labelDataStorePort?: LabelDataStorePort;
    pieceActivityServicePort?: PieceActivityServicePort;
    strategies?: Partial<Record<TestType, LabelStrategy<Piece<TestType>>>>;
    labelDateFormatServicePort?: LabelDateFormatServicePort;
    idGeneratorPort?: IdGeneratorPort;
    activityIndicatorsAdapterPort?: ActivityIndicatorsAdapterPort;
    labelAnimationAdapterPort?: LabelFeedbackAdapterPort;
  } = {}
) =>
  new PieceLabelService<TestType>({
    labelAdapterPort: makeLabelAdapter(),
    labelDataStorePort: makeLabelDataStore(),
    pieceActivityServicePort: makeActivityPort(),
    labelPropertiesStrategies: { StackBook: makeStrategy() },
    labelDateFormatServicePort: makeDateFormatPort(),
    idGeneratorPort: makeIdPort(),
    activityIndicatorsAdapterPort: makeIndicatorsAdapter(),
    labelAnimationAdapterPort: makeAnimationAdapter(),
    ...overrides,
    ...(overrides.strategies
      ? { labelPropertiesStrategies: overrides.strategies as any }
      : {}),
  });

// ─── showLabel — existing label ───────────────────────────────────────────────

describe("showLabel — existing label data", () => {
  it("calls displayShowFeedback with the existing data when a label already exists", async () => {
    const animationAdapter = makeAnimationAdapter();
    const existingData = { id: "existing-1" } as unknown as InfoLabelData;
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(existingData),
    });
    const svc = makeService({
      labelDataStorePort,
      labelAnimationAdapterPort: animationAdapter,
    });
    await svc.showLabel({
      piece: makePiece("StackBook"),
      translucencyMode: "Solid",
    });
    expect(animationAdapter.displayShowFeedback).toHaveBeenCalledWith({
      data: existingData,
      pacing: "Regular",
    });
  });

  it("uses the provided pacing when a label already exists", async () => {
    const animationAdapter = makeAnimationAdapter();
    const existingData = { id: "existing-1" } as unknown as InfoLabelData;
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(existingData),
    });
    const svc = makeService({
      labelDataStorePort,
      labelAnimationAdapterPort: animationAdapter,
    });
    await svc.showLabel({
      piece: makePiece("StackBook"),
      translucencyMode: "Solid",
      pacing: "Fast",
    });
    expect(animationAdapter.displayShowFeedback).toHaveBeenCalledWith({
      data: existingData,
      pacing: "Fast",
    });
  });

  it("does not call spawnLabel when a label already exists", async () => {
    const labelAdapterPort = makeLabelAdapter();
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue({ id: "existing" } as any),
    });
    const svc = makeService({ labelAdapterPort, labelDataStorePort });
    await svc.showLabel({
      piece: makePiece("StackBook"),
      translucencyMode: "Solid",
    });
    expect(labelAdapterPort.spawnLabel).not.toHaveBeenCalled();
  });

  it("does not call addLabelData when a label already exists", async () => {
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue({ id: "existing" } as any),
    });
    const svc = makeService({ labelDataStorePort });
    await svc.showLabel({
      piece: makePiece("StackBook"),
      translucencyMode: "Solid",
    });
    expect(labelDataStorePort.addLabelData).not.toHaveBeenCalled();
  });
});

// ─── showLabel — new label ────────────────────────────────────────────────────

describe("showLabel — new label creation", () => {
  it("throws when no strategy is registered for the piece type", async () => {
    const svc = makeService({ strategies: {} as any });
    await expect(
      svc.showLabel({
        piece: makePiece("StackBook"),
        translucencyMode: "Solid",
      })
    ).rejects.toThrow("PieceLabelService: strategy not found at showLabel");
  });

  it("calls all strategy methods to get label properties", async () => {
    const strategy = makeStrategy();
    const piece = makePiece("StackBook");
    const svc = makeService({ strategies: { StackBook: strategy } });
    await svc.showLabel({ piece, translucencyMode: "Solid" });
    expect(strategy.getLabel).toHaveBeenCalledWith(piece);
    expect(strategy.getDate).toHaveBeenCalledWith(piece);
    expect(strategy.getColor).toHaveBeenCalledWith(piece);
    expect(strategy.getLabelColor).toHaveBeenCalledWith(piece);
  });

  it("passes all strategy properties and dateFormat to spawnLabel", async () => {
    const strategy = makeStrategy({
      getLabel: jest.fn().mockReturnValue("Genesis"),
      getDate: jest.fn().mockReturnValue("2024-01-01"),
      getColor: jest.fn().mockReturnValue("#aabbcc"),
      getLabelColor: jest.fn().mockReturnValue("#112233"),
      labelPositioning: LabelPosition.Top,
      isInteractable: true,
    });
    const labelAdapterPort = makeLabelAdapter();
    const labelDateFormatServicePort = { dateFormat: "Relative" as const };
    const piece = makePiece("StackBook");
    const svc = makeService({
      strategies: { StackBook: strategy },
      labelAdapterPort,
      labelDateFormatServicePort,
    });
    await svc.showLabel({ piece, translucencyMode: "Faded" });
    expect(labelAdapterPort.spawnLabel).toHaveBeenCalledWith({
      piece,
      label: "Genesis",
      date: "2024-01-01",
      color: "#aabbcc",
      labelColor: "#112233",
      labelPositioning: LabelPosition.Top,
      isInteractable: true,
      makesAttentionFeedback: false,
      dateFormat: "Relative",
      translucencyMode: "Faded",
    });
  });

  it("creates an InfoLabelData with the id from idGeneratorPort", async () => {
    const idGeneratorPort = makeIdPort();
    const activityPort = makeActivityPort();
    const svc = makeService({
      idGeneratorPort,
      pieceActivityServicePort: activityPort,
    });
    await svc.showLabel({
      piece: makePiece("StackBook"),
      translucencyMode: "Solid",
    });
    const [labelData] = (activityPort.updateIndicators as jest.Mock).mock
      .calls[0];
    expect(labelData).toBeInstanceOf(InfoLabelData);
    expect(labelData.id).toBe("label-id-1");
  });

  it("creates an InfoLabelData whose owner is the input piece", async () => {
    const activityPort = makeActivityPort();
    const piece = makePiece("StackBook", "book-42");
    const svc = makeService({ pieceActivityServicePort: activityPort });
    await svc.showLabel({ piece, translucencyMode: "Solid" });
    const [labelData] = (activityPort.updateIndicators as jest.Mock).mock
      .calls[0];
    expect(labelData.owner).toBe(piece);
  });

  it("calls updateIndicators with the new InfoLabelData", async () => {
    const activityPort = makeActivityPort();
    const labelDataStorePort = makeLabelDataStore();
    const svc = makeService({
      pieceActivityServicePort: activityPort,
      labelDataStorePort,
    });
    await svc.showLabel({
      piece: makePiece("StackBook"),
      translucencyMode: "Solid",
    });
    expect(activityPort.updateIndicators).toHaveBeenCalledTimes(1);
    expect(activityPort.updateIndicators).toHaveBeenCalledWith(
      expect.any(InfoLabelData)
    );
  });

  it("calls addLabelData with the new InfoLabelData", async () => {
    const labelDataStorePort = makeLabelDataStore();
    const svc = makeService({ labelDataStorePort });
    await svc.showLabel({
      piece: makePiece("StackBook"),
      translucencyMode: "Solid",
    });
    expect(labelDataStorePort.addLabelData).toHaveBeenCalledWith(
      expect.any(InfoLabelData)
    );
  });

  it("calls displayAttentionFeedback with the new InfoLabelData", async () => {
    const animationAdapter = makeAnimationAdapter();
    const svc = makeService({ labelAnimationAdapterPort: animationAdapter });
    await svc.showLabel({
      piece: makePiece("StackBook"),
      translucencyMode: "Solid",
    });
    expect(animationAdapter.displayAttentionFeedback).toHaveBeenCalledWith(
      expect.any(InfoLabelData)
    );
  });

  it("calls displayShowFeedback with the new data and default pacing", async () => {
    const animationAdapter = makeAnimationAdapter();
    const svc = makeService({ labelAnimationAdapterPort: animationAdapter });
    await svc.showLabel({
      piece: makePiece("StackBook"),
      translucencyMode: "Solid",
    });
    expect(animationAdapter.displayShowFeedback).toHaveBeenCalledWith({
      data: expect.any(InfoLabelData),
      pacing: "Regular",
    });
  });

  it("calls displayShowFeedback with the provided pacing", async () => {
    const animationAdapter = makeAnimationAdapter();
    const svc = makeService({ labelAnimationAdapterPort: animationAdapter });
    await svc.showLabel({
      piece: makePiece("StackBook"),
      translucencyMode: "Solid",
      pacing: "Slow",
    });
    expect(animationAdapter.displayShowFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ pacing: "Slow" })
    );
  });

  it("the same InfoLabelData instance is passed to updateIndicators, addLabelData, and displayShowFeedback", async () => {
    const activityPort = makeActivityPort();
    const labelDataStorePort = makeLabelDataStore();
    const animationAdapter = makeAnimationAdapter();
    const svc = makeService({
      pieceActivityServicePort: activityPort,
      labelDataStorePort,
      labelAnimationAdapterPort: animationAdapter,
    });
    await svc.showLabel({
      piece: makePiece("StackBook"),
      translucencyMode: "Solid",
    });
    const [fromUpdate] = (activityPort.updateIndicators as jest.Mock).mock
      .calls[0];
    const [fromAdd] = (labelDataStorePort.addLabelData as jest.Mock).mock
      .calls[0];
    const [{ data: fromShow }] = (
      animationAdapter.displayShowFeedback as jest.Mock
    ).mock.calls[0];
    expect(fromUpdate).toBe(fromAdd);
    expect(fromAdd).toBe(fromShow);
  });
});

// ─── changeIntensity ──────────────────────────────────────────────────────────

describe("changeIntensity", () => {
  it("is a no-op when no label data exists for the piece", async () => {
    const animationAdapter = makeAnimationAdapter();
    const svc = makeService({ labelAnimationAdapterPort: animationAdapter });
    await svc.changeIntensity(makePiece("StackBook"), "Solid");
    expect(animationAdapter.displayAttentionFeedback).not.toHaveBeenCalled();
    expect(animationAdapter.stopAttentionFeedback).not.toHaveBeenCalled();
    expect(
      animationAdapter.displayChangedIntensityFeedback
    ).not.toHaveBeenCalled();
  });

  it("calls displayAttentionFeedback when translucencyMode is Solid", async () => {
    const labelData = { id: "lbl-1" } as unknown as InfoLabelData;
    const animationAdapter = makeAnimationAdapter();
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(labelData),
    });
    const svc = makeService({
      labelDataStorePort,
      labelAnimationAdapterPort: animationAdapter,
    });
    await svc.changeIntensity(makePiece("StackBook"), "Solid");
    expect(animationAdapter.displayAttentionFeedback).toHaveBeenCalledWith(
      labelData
    );
    expect(animationAdapter.stopAttentionFeedback).not.toHaveBeenCalled();
  });

  it("calls stopAttentionFeedback when translucencyMode is Faded", async () => {
    const labelData = { id: "lbl-1" } as unknown as InfoLabelData;
    const animationAdapter = makeAnimationAdapter();
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(labelData),
    });
    const svc = makeService({
      labelDataStorePort,
      labelAnimationAdapterPort: animationAdapter,
    });
    await svc.changeIntensity(makePiece("StackBook"), "Faded");
    expect(animationAdapter.stopAttentionFeedback).toHaveBeenCalledWith(
      labelData
    );
    expect(animationAdapter.displayAttentionFeedback).not.toHaveBeenCalled();
  });

  it("always calls displayChangedIntensityFeedback when label data exists", async () => {
    const labelData = { id: "lbl-1" } as unknown as InfoLabelData;
    const animationAdapter = makeAnimationAdapter();
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(labelData),
    });
    const svc = makeService({
      labelDataStorePort,
      labelAnimationAdapterPort: animationAdapter,
    });
    await svc.changeIntensity(makePiece("StackBook"), "Solid");
    expect(
      animationAdapter.displayChangedIntensityFeedback
    ).toHaveBeenCalledWith({
      data: labelData,
      translucencyMode: "Solid",
      pacing: "Regular",
    });
  });

  it("uses the provided pacing argument", async () => {
    const labelData = { id: "lbl-1" } as unknown as InfoLabelData;
    const animationAdapter = makeAnimationAdapter();
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(labelData),
    });
    const svc = makeService({
      labelDataStorePort,
      labelAnimationAdapterPort: animationAdapter,
    });
    await svc.changeIntensity(makePiece("StackBook"), "Faded", "Instant");
    expect(
      animationAdapter.displayChangedIntensityFeedback
    ).toHaveBeenCalledWith(expect.objectContaining({ pacing: "Instant" }));
  });
});

// ─── hideLabel ────────────────────────────────────────────────────────────────

describe("hideLabel", () => {
  const makeLabelDataInstance = () =>
    new InfoLabelData({
      id: "lbl-1",
      transformer: makePiece("InfoLabelTransformer", "t-1"),
      tail: makePiece("InfoLabelTail", "tail-1"),
      label: makePiece("InfoLabelText", "text-1"),
      owner: makePiece("StackBook"),
      positioning: LabelPosition.RightSided,
    });

  it("throws when no label data exists for the piece", async () => {
    const svc = makeService();
    await expect(svc.hideLabel(makePiece("StackBook"))).rejects.toThrow(
      "PieceLabelService: labelData not found at hideLabel"
    );
  });

  it("calls beginHiding then displayHideFeedback then endHiding in order", async () => {
    const labelData = makeLabelDataInstance();
    const beginSpy = jest.spyOn(labelData, "beginHiding");
    const endSpy = jest.spyOn(labelData, "endHiding");
    const order: string[] = [];
    beginSpy.mockImplementation(() => order.push("begin"));
    const animationAdapter = makeAnimationAdapter({
      displayHideFeedback: jest
        .fn()
        .mockImplementation(async () => order.push("hide")),
    });
    endSpy.mockImplementation(() => order.push("end"));
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(labelData),
    });
    const svc = makeService({
      labelDataStorePort,
      labelAnimationAdapterPort: animationAdapter,
    });
    await svc.hideLabel(makePiece("StackBook"));
    expect(order).toEqual(["begin", "hide", "end"]);
  });

  it("calls displayHideFeedback with the label data and default pacing", async () => {
    const labelData = makeLabelDataInstance();
    const animationAdapter = makeAnimationAdapter();
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(labelData),
    });
    const svc = makeService({
      labelDataStorePort,
      labelAnimationAdapterPort: animationAdapter,
    });
    await svc.hideLabel(makePiece("StackBook"));
    expect(animationAdapter.displayHideFeedback).toHaveBeenCalledWith({
      data: labelData,
      pacing: "Regular",
    });
  });

  it("uses the provided pacing argument", async () => {
    const labelData = makeLabelDataInstance();
    const animationAdapter = makeAnimationAdapter();
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(labelData),
    });
    const svc = makeService({
      labelDataStorePort,
      labelAnimationAdapterPort: animationAdapter,
    });
    await svc.hideLabel(makePiece("StackBook"), "Fast");
    expect(animationAdapter.displayHideFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ pacing: "Fast" })
    );
  });

  it("calls hideIndicators when clearActivityIndicators returns indicators", async () => {
    const indicator = makeIndicator();
    const labelData = makeLabelDataInstance();
    // Seed an indicator by pre-populating via the internal map — use clearActivityIndicators to test
    const clearSpy = jest
      .spyOn(labelData, "clearActivityIndicators")
      .mockReturnValue([indicator]);
    const indicatorsAdapter = makeIndicatorsAdapter();
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(labelData),
    });
    const svc = makeService({
      labelDataStorePort,
      activityIndicatorsAdapterPort: indicatorsAdapter,
    });
    await svc.hideLabel(makePiece("StackBook"));
    expect(indicatorsAdapter.hideIndicators).toHaveBeenCalledWith([indicator]);
    clearSpy.mockRestore();
  });

  it("does not call hideIndicators when clearActivityIndicators returns undefined", async () => {
    const labelData = makeLabelDataInstance();
    const clearSpy = jest
      .spyOn(labelData, "clearActivityIndicators")
      .mockReturnValue(undefined);
    const indicatorsAdapter = makeIndicatorsAdapter();
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(labelData),
    });
    const svc = makeService({
      labelDataStorePort,
      activityIndicatorsAdapterPort: indicatorsAdapter,
    });
    await svc.hideLabel(makePiece("StackBook"));
    expect(indicatorsAdapter.hideIndicators).not.toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it("calls stopAttentionFeedback after clearing indicators", async () => {
    const labelData = makeLabelDataInstance();
    const animationAdapter = makeAnimationAdapter();
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(labelData),
    });
    const svc = makeService({
      labelDataStorePort,
      labelAnimationAdapterPort: animationAdapter,
    });
    await svc.hideLabel(makePiece("StackBook"));
    expect(animationAdapter.stopAttentionFeedback).toHaveBeenCalledWith(
      labelData
    );
  });

  it("calls despawnLabel with the label data", async () => {
    const labelData = makeLabelDataInstance();
    const labelAdapterPort = makeLabelAdapter();
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(labelData),
    });
    const svc = makeService({ labelAdapterPort, labelDataStorePort });
    await svc.hideLabel(makePiece("StackBook"));
    expect(labelAdapterPort.despawnLabel).toHaveBeenCalledWith(labelData);
  });

  it("calls removeLabelData with the label data", async () => {
    const labelData = makeLabelDataInstance();
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(labelData),
    });
    const svc = makeService({ labelDataStorePort });
    await svc.hideLabel(makePiece("StackBook"));
    expect(labelDataStorePort.removeLabelData).toHaveBeenCalledWith(labelData);
  });

  it("looks up label data by the input piece's id", async () => {
    const labelDataStorePort = makeLabelDataStore({
      getDataByOwnerId: jest.fn().mockReturnValue(undefined),
    });
    const svc = makeService({ labelDataStorePort });
    const piece = makePiece("StackBook", "book-77");
    await expect(svc.hideLabel(piece)).rejects.toThrow();
    expect(labelDataStorePort.getDataByOwnerId).toHaveBeenCalledWith("book-77");
  });
});
