import { ActivityIndicatorsAdapter } from "bibleVizUtils.infrastructure.adapters.pieceActivity.ActivityIndicatorsAdapter";
import { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import { LabelPosition } from "bibleVizUtils.domain.models.label";
import { BiblePiece } from "bibleVizUtils.domain.models.canvas";

// ─── module mocks ─────────────────────────────────────────────────────────────

jest.mock("bibleVizUtils.infrastructure.functions.casualos", () => ({
  GetBotScales: jest.fn().mockReturnValue({ x: 1, y: 1, z: 0.1 }),
}));

// ─── globals ──────────────────────────────────────────────────────────────────

class Vec3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0
  ) {}
}

let applyModMock: jest.Mock;
let setTagMock: jest.Mock;
let getBotMock: jest.Mock;
let byIDMock: jest.Mock;
let getBotPositionMock: jest.Mock;
let activityIndicatorMapper: {
  toInfrastructure: jest.Mock;
  toDomain: jest.Mock;
};
let infoLabelTextMapper: { toInfrastructure: jest.Mock };
let dimensionProvider: { getDimension: jest.Mock };

beforeEach(() => {
  applyModMock = jest.fn();
  setTagMock = jest.fn();
  getBotMock = jest.fn().mockReturnValue(undefined);
  byIDMock = jest.fn().mockImplementation((id: string) => ({ byId: id }));
  getBotPositionMock = jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 });
  activityIndicatorMapper = {
    toInfrastructure: jest.fn(),
    toDomain: jest.fn(),
  };
  infoLabelTextMapper = { toInfrastructure: jest.fn() };
  dimensionProvider = { getDimension: jest.fn().mockReturnValue("scene3d") };

  (globalThis as any).Vector3 = Vec3;
  (globalThis as any).applyMod = applyModMock;
  (globalThis as any).setTag = setTagMock;
  (globalThis as any).getBot = getBotMock;
  (globalThis as any).byID = byIDMock;
  (globalThis as any).getBotPosition = getBotPositionMock;
});

afterEach(() => {
  delete (globalThis as any).Vector3;
  delete (globalThis as any).applyMod;
  delete (globalThis as any).setTag;
  delete (globalThis as any).getBot;
  delete (globalThis as any).byID;
  delete (globalThis as any).getBotPosition;
  jest.clearAllMocks();
});

// ─── factories ────────────────────────────────────────────────────────────────

const makeIndicatorBot = (tagOverrides: any = {}): any => ({
  id: "indicator-bot-1",
  link: "",
  tags: {
    type: "ActivityIndicator",
    ownerBotId: "piece-bot-1",
    ownerDataId: "data-1",
    index: 0,
    scaleZ: 0.1,
    ...tagOverrides,
  },
  masks: {},
  links: {},
  vars: {},
  raw: {},
  changes: {},
  maskChanges: {},
});

const makeOwnerBot = (type: string = BiblePiece.StackChapter): any => ({
  id: "piece-bot-1",
  link: "",
  tags: { type },
  masks: {},
  links: {},
  vars: {},
  raw: {},
  changes: {},
  maskChanges: {},
});

const makeActivityIndicator = (overrides: any = {}): any => ({
  id: "indicator-1",
  type: "ActivityIndicator" as const,
  indicatorType: "regular" as const,
  index: 0,
  ...overrides,
});

const makeDomainIndicator = (id = "domain-indicator-1"): any => ({
  id,
  type: "ActivityIndicator" as const,
  indicatorType: "regular" as const,
  index: 0,
});

const makePieceContainer = (overrides: any = {}): any => ({
  id: "container-1",
  piece: { id: "piece-1", type: BiblePiece.StackChapter },
  activityIndicators: [],
  ...overrides,
});

const makeInfoLabelContainer = () =>
  new InfoLabelData({
    id: "label-container-1",
    transformer: { id: "t-1", type: "InfoLabelTransformer" as const },
    tail: { id: "tail-1", type: "InfoLabelTail" as const },
    label: { id: "text-1", type: "InfoLabelText" as const },
    owner: { id: "owner-transformer-1", type: "InfoLabelTransformer" as const },
    positioning: LabelPosition.RightSided,
  });

const makeConfigProvider = (): any => ({
  getVisualConfig: jest.fn().mockImplementation((key: string) => {
    const configs: Record<string, any> = {
      LabelScales: { x: 0.5, y: 0.5, z: 0 },
      LabelOffset: { x: 0.25, y: 0, z: 0.1 },
      LabelStep: { x: 0.3, y: 0, z: 0.02 },
      LabelForm: "circle",
      LabelExtraUsersContentScales: { x: 0.4, y: 0.4, z: 0 },
      LabelExtraUsersBackgroundScales: { x: 0.5, y: 0.5, z: 0 },
      GroundedScales: { x: 0.25, y: 0.25, z: 0.125 },
      GroundedForm: "sphere",
      GroundedExtraUsersContentScales: { x: 0.2, y: 0.2, z: 0.125 },
      GroundedExtraUsersBackgroundScales: { x: 0.25, y: 0.25, z: 0.03 },
      ChapterOffset: { x: 0.075, y: 0.075, z: 0 },
      ChapterStep: { x: 0.275, y: 0, z: 0 },
      ScriptureMapBookOffset: { x: 0.1, y: 0.1, z: 0 },
      ScriptureMapBookStep: { x: 0.3, y: 0, z: 0 },
    };
    return configs[key];
  }),
});

const makePooler = (): any => ({
  getObject: jest.fn().mockReturnValue(makeIndicatorBot()),
  releaseObject: jest.fn(),
});

const makeBotsRepository = (): any => ({
  getIndicatorBotsByPieceId: jest.fn().mockReturnValue([]),
  getIndicatorBotsByPieceDataId: jest.fn().mockReturnValue([]),
});

const makeAdapter = (
  pooler = makePooler(),
  configProvider = makeConfigProvider(),
  botsRepository = makeBotsRepository()
) =>
  new ActivityIndicatorsAdapter({
    objectPooler: pooler,
    configProviderPort: configProvider,
    botsRepositoryPort: botsRepository,
    activityIndicatorMapperPort: activityIndicatorMapper,
    labelTextMapperPort: infoLabelTextMapper,
    dimensionProviderPort: dimensionProvider,
  });

const makeRegularCommand = (overrides: any = {}): any => ({
  type: "regular" as const,
  index: 0,
  indicator: undefined,
  isOwnUserActiveActivity: false,
  color: "#ff0000",
  ...overrides,
});

// ─── showIndicators ───────────────────────────────────────────────────────────

describe("showIndicators", () => {
  describe("guards", () => {
    it("throws when piece is not found on the container", () => {
      const container = makePieceContainer({ piece: undefined });
      expect(() =>
        makeAdapter().showIndicators({
          container,
          command: makeRegularCommand(),
        })
      ).toThrow("ActivityIndicatorsAdapter: piece not found at showIndicators");
    });

    it("throws when no update strategy exists for the piece type", () => {
      const container = makePieceContainer({
        piece: { id: "p1", type: "StackBook" },
      });
      expect(() =>
        makeAdapter().showIndicators({
          container,
          command: makeRegularCommand(),
        })
      ).toThrow("ActivityIndicatorsAdapter: strategy not found for pieceType");
    });

    it("throws when indicator command has indicator but toInfrastructure returns undefined", () => {
      activityIndicatorMapper.toInfrastructure.mockReturnValue(undefined);
      const command = makeRegularCommand({
        indicator: makeActivityIndicator(),
      });
      expect(() =>
        makeAdapter().showIndicators({
          container: makePieceContainer(),
          command,
        })
      ).toThrow(
        "ActivityIndicatorsAdapter: indicator not found at showIndicators"
      );
    });

    it("throws when no indicator provided and objectPooler.getObject returns undefined", () => {
      const pooler = makePooler();
      pooler.getObject.mockReturnValue(undefined);
      expect(() =>
        makeAdapter(pooler).showIndicators({
          container: makePieceContainer(),
          command: makeRegularCommand({ indicator: undefined }),
        })
      ).toThrow(
        "ActivityIndicatorsAdapter: indicator not found at showIndicators"
      );
    });
  });

  describe("piece resolution", () => {
    it("uses container.owner as piece for InfoLabelData containers", () => {
      const container = makeInfoLabelContainer();
      const pooler = makePooler();
      makeAdapter(pooler).showIndicators({
        container,
        command: makeRegularCommand(),
      });
      const mod = applyModMock.mock.calls[0][1];
      // InfoLabelData owner is "InfoLabelTransformer" type → transformer field should be owner.id
      expect(mod.transformer).toBe(container.owner.id);
    });

    it("uses container.piece as piece for non-InfoLabelData containers", () => {
      const container = makePieceContainer({
        piece: { id: "chapter-piece", type: BiblePiece.StackChapter },
      });
      makeAdapter().showIndicators({
        container,
        command: makeRegularCommand(),
      });
      const mod = applyModMock.mock.calls[0][1];
      expect(mod.ownerBotId).toBe("chapter-piece");
    });
  });

  describe("indicator bot acquisition", () => {
    it("calls objectPooler.getObject(ActivityIndicator) when command has no indicator", () => {
      const pooler = makePooler();
      makeAdapter(pooler).showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand({ indicator: undefined }),
      });
      expect(pooler.getObject).toHaveBeenCalledWith(
        BiblePiece.ActivityIndicator
      );
    });

    it("calls ActivityIndicatorMapper.toInfrastructure when command has an indicator", () => {
      const indicator = makeActivityIndicator();
      activityIndicatorMapper.toInfrastructure.mockReturnValue(
        makeIndicatorBot()
      );
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand({ indicator }),
      });
      expect(activityIndicatorMapper.toInfrastructure).toHaveBeenCalledWith(
        indicator
      );
    });

    it("does not call objectPooler.getObject when command provides an indicator", () => {
      activityIndicatorMapper.toInfrastructure.mockReturnValue(
        makeIndicatorBot()
      );
      const pooler = makePooler();
      makeAdapter(pooler).showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand({ indicator: makeActivityIndicator() }),
      });
      expect(pooler.getObject).not.toHaveBeenCalled();
    });
  });

  describe("baseMod fields", () => {
    it("sets ownerBotId to the piece id", () => {
      const container = makePieceContainer({
        piece: { id: "the-piece", type: BiblePiece.StackChapter },
      });
      makeAdapter().showIndicators({
        container,
        command: makeRegularCommand(),
      });
      expect(applyModMock.mock.calls[0][1].ownerBotId).toBe("the-piece");
    });

    it("sets ownerDataId to the container id", () => {
      const container = makePieceContainer({ id: "the-container" });
      makeAdapter().showIndicators({
        container,
        command: makeRegularCommand(),
      });
      expect(applyModMock.mock.calls[0][1].ownerDataId).toBe("the-container");
    });

    it("sets isActivityIndicator=true", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand(),
      });
      expect(applyModMock.mock.calls[0][1].isActivityIndicator).toBe(true);
    });

    it("sets transformer to piece.id when piece is InfoLabelTransformer", () => {
      const container = makeInfoLabelContainer();
      makeAdapter().showIndicators({
        container,
        command: makeRegularCommand(),
      });
      const mod = applyModMock.mock.calls[0][1];
      expect(mod.transformer).toBe("owner-transformer-1");
    });

    it("sets transformer to undefined when piece is not InfoLabelTransformer", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand(),
      });
      expect(applyModMock.mock.calls[0][1].transformer).toBeUndefined();
    });

    it("sets the dimension tag to true", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand(),
      });
      expect(applyModMock.mock.calls[0][1]["scene3d"]).toBe(true);
    });
  });

  describe("regular command", () => {
    it("sets indicatorType='regular'", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand(),
      });
      expect(applyModMock.mock.calls[0][1].indicatorType).toBe("regular");
    });

    it("sets formOpacity=1 and targetOpacity=1 when isOwnUserActiveActivity=true", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand({ isOwnUserActiveActivity: true }),
      });
      const mod = applyModMock.mock.calls[0][1];
      expect(mod.formOpacity).toBe(1);
      expect(mod.targetOpacity).toBe(1);
    });

    it("sets formOpacity=0.5 and targetOpacity=0.5 when isOwnUserActiveActivity=false", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand({ isOwnUserActiveActivity: false }),
      });
      const mod = applyModMock.mock.calls[0][1];
      expect(mod.formOpacity).toBe(0.5);
      expect(mod.targetOpacity).toBe(0.5);
    });

    it("sets formRenderOrder=-1 when isOwnUserActiveActivity=true", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand({ isOwnUserActiveActivity: true }),
      });
      expect(applyModMock.mock.calls[0][1].formRenderOrder).toBe(-1);
    });

    it("sets formRenderOrder=10-index when isOwnUserActiveActivity=false", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand({
          isOwnUserActiveActivity: false,
          index: 3,
        }),
      });
      expect(applyModMock.mock.calls[0][1].formRenderOrder).toBe(7);
    });

    it("uses the provided color", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand({ color: "#abcdef" }),
      });
      expect(applyModMock.mock.calls[0][1].color).toBe("#abcdef");
    });
  });

  describe("extraContent command", () => {
    it("sets indicatorType='extraContent'", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: {
          type: "extraContent" as const,
          index: 0,
          indicator: undefined,
          extraUsers: 3,
        },
      });
      expect(applyModMock.mock.calls[0][1].indicatorType).toBe("extraContent");
    });

    it("sets label to '+{extraUsers}'", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: {
          type: "extraContent" as const,
          index: 0,
          indicator: undefined,
          extraUsers: 7,
        },
      });
      expect(applyModMock.mock.calls[0][1].label).toBe("+7");
    });

    it("sets formOpacity=1 and targetOpacity=1", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: {
          type: "extraContent" as const,
          index: 0,
          indicator: undefined,
          extraUsers: 2,
        },
      });
      const mod = applyModMock.mock.calls[0][1];
      expect(mod.formOpacity).toBe(1);
      expect(mod.targetOpacity).toBe(1);
    });
  });

  describe("extraBackground command", () => {
    it("sets indicatorType='extraBackground'", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: {
          type: "extraBackground" as const,
          index: 0,
          indicator: undefined,
        },
      });
      expect(applyModMock.mock.calls[0][1].indicatorType).toBe(
        "extraBackground"
      );
    });

    it("sets color='#000000'", () => {
      makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: {
          type: "extraBackground" as const,
          index: 0,
          indicator: undefined,
        },
      });
      expect(applyModMock.mock.calls[0][1].color).toBe("#000000");
    });
  });

  describe("return value and array commands", () => {
    it("returns mapped domain indicators via ActivityIndicatorMapper.toDomain", () => {
      const domainIndicator = makeDomainIndicator();
      activityIndicatorMapper.toDomain.mockReturnValue(domainIndicator);
      const result = makeAdapter().showIndicators({
        container: makePieceContainer(),
        command: makeRegularCommand(),
      });
      expect(result).toContain(domainIndicator);
    });

    it("processes an array of commands and calls applyMod once per command", () => {
      const pooler = makePooler();
      pooler.getObject
        .mockReturnValueOnce(makeIndicatorBot())
        .mockReturnValueOnce(makeIndicatorBot({ id: "indicator-bot-2" }));
      makeAdapter(pooler).showIndicators({
        container: makePieceContainer(),
        command: [
          makeRegularCommand({ index: 0 }),
          makeRegularCommand({ index: 1 }),
        ],
      });
      expect(applyModMock).toHaveBeenCalledTimes(2);
    });

    it("returns one domain indicator per command in the array", () => {
      const pooler = makePooler();
      pooler.getObject
        .mockReturnValueOnce(makeIndicatorBot())
        .mockReturnValueOnce(makeIndicatorBot({ id: "indicator-bot-2" }));
      activityIndicatorMapper.toDomain
        .mockReturnValueOnce(makeDomainIndicator("d1"))
        .mockReturnValueOnce(makeDomainIndicator("d2"));
      const result = makeAdapter(pooler).showIndicators({
        container: makePieceContainer(),
        command: [
          makeRegularCommand({ index: 0 }),
          makeRegularCommand({ index: 1 }),
        ],
      });
      expect(result).toHaveLength(2);
    });
  });
});

// ─── hideIndicators ───────────────────────────────────────────────────────────

describe("hideIndicators", () => {
  it("is a no-op when indicators array is empty", () => {
    makeAdapter().hideIndicators([]);
    expect(activityIndicatorMapper.toInfrastructure).not.toHaveBeenCalled();
  });

  it("calls hideIndicator once per indicator", () => {
    const bot1 = makeIndicatorBot();
    const bot2 = makeIndicatorBot({ id: "bot-2" });
    activityIndicatorMapper.toInfrastructure
      .mockReturnValueOnce(bot1)
      .mockReturnValueOnce(bot2);
    const pooler = makePooler();
    const indicators = [
      makeActivityIndicator("i1"),
      makeActivityIndicator("i2"),
    ];
    makeAdapter(pooler).hideIndicators(indicators);
    expect(pooler.releaseObject).toHaveBeenCalledTimes(2);
  });
});

// ─── hideIndicator ────────────────────────────────────────────────────────────

describe("hideIndicator", () => {
  it("calls objectPooler.releaseObject with the bot and 'ActivityIndicator' key", () => {
    const bot = makeIndicatorBot();
    activityIndicatorMapper.toInfrastructure.mockReturnValue(bot);
    const pooler = makePooler();
    makeAdapter(pooler).hideIndicator(makeActivityIndicator());
    expect(pooler.releaseObject).toHaveBeenCalledWith(bot, "ActivityIndicator");
  });

  it("does not call releaseObject when toInfrastructure returns undefined", () => {
    activityIndicatorMapper.toInfrastructure.mockReturnValue(undefined);
    const pooler = makePooler();
    makeAdapter(pooler).hideIndicator(makeActivityIndicator());
    expect(pooler.releaseObject).not.toHaveBeenCalled();
  });
});

// ─── updateIndicatorsPosition ─────────────────────────────────────────────────

describe("updateIndicatorsPosition", () => {
  it("is a no-op when container has no activity indicators", () => {
    makeAdapter().updateIndicatorsPosition(
      makePieceContainer({ activityIndicators: [] })
    );
    expect(activityIndicatorMapper.toInfrastructure).not.toHaveBeenCalled();
  });

  it("calls updateIndicatorPosition for each indicator", () => {
    const indicator = makeActivityIndicator();
    activityIndicatorMapper.toInfrastructure.mockReturnValue(undefined);
    const container = makePieceContainer({ activityIndicators: [indicator] });
    makeAdapter().updateIndicatorsPosition(container);
    expect(activityIndicatorMapper.toInfrastructure).toHaveBeenCalledWith(
      indicator
    );
  });

  it("calls updateIndicatorPosition for all indicators in the container", () => {
    activityIndicatorMapper.toInfrastructure.mockReturnValue(undefined);
    const container = makePieceContainer({
      activityIndicators: [
        makeActivityIndicator("i1"),
        makeActivityIndicator("i2"),
      ],
    });
    makeAdapter().updateIndicatorsPosition(container);
    expect(activityIndicatorMapper.toInfrastructure).toHaveBeenCalledTimes(2);
  });
});

// ─── updateIndicatorPosition ──────────────────────────────────────────────────

describe("updateIndicatorPosition", () => {
  it("does nothing when toInfrastructure returns undefined", () => {
    activityIndicatorMapper.toInfrastructure.mockReturnValue(undefined);
    makeAdapter().updateIndicatorPosition(
      makeActivityIndicator(),
      makePieceContainer()
    );
    expect(setTagMock).not.toHaveBeenCalled();
  });

  it("throws when indicatorBot.tags.ownerBotId is undefined", () => {
    const bot = makeIndicatorBot({ ownerBotId: undefined });
    activityIndicatorMapper.toInfrastructure.mockReturnValue(bot);
    expect(() =>
      makeAdapter().updateIndicatorPosition(
        makeActivityIndicator(),
        makePieceContainer()
      )
    ).toThrow(
      "ActivityIndicatorsAdapter: indicatorBot.tags.ownerBotId is not defined"
    );
  });

  it("throws when ownerBot is not found by getBot", () => {
    const bot = makeIndicatorBot({ ownerBotId: "owner-id" });
    activityIndicatorMapper.toInfrastructure.mockReturnValue(bot);
    getBotMock.mockReturnValue(undefined);
    expect(() =>
      makeAdapter().updateIndicatorPosition(
        makeActivityIndicator(),
        makePieceContainer()
      )
    ).toThrow(
      "ActivityIndicatorsAdapter: ownerBot not found at updateIndicatorPosition"
    );
  });

  it("throws when no position strategy exists for ownerBot.tags.type", () => {
    const indicatorBot = makeIndicatorBot({ ownerBotId: "owner-id" });
    activityIndicatorMapper.toInfrastructure.mockReturnValue(indicatorBot);
    getBotMock.mockReturnValue(makeOwnerBot("StackBook"));
    expect(() =>
      makeAdapter().updateIndicatorPosition(
        makeActivityIndicator(),
        makePieceContainer()
      )
    ).toThrow("ActivityIndicatorsAdapter: Strategy not found for StackBook");
  });

  it("calls setTag 4 times (x, y, z, initialPosition) when positioning succeeds", () => {
    const indicatorBot = makeIndicatorBot({
      ownerBotId: "owner-id",
      index: 0,
      scaleZ: 0.1,
    });
    activityIndicatorMapper.toInfrastructure.mockReturnValue(indicatorBot);
    getBotMock.mockReturnValue(makeOwnerBot(BiblePiece.StackChapter));
    makeAdapter().updateIndicatorPosition(
      makeActivityIndicator(),
      makePieceContainer()
    );
    expect(setTagMock).toHaveBeenCalledTimes(4);
  });

  it("sets dimension x tag using the current dimension", () => {
    const indicatorBot = makeIndicatorBot({
      ownerBotId: "owner-id",
      index: 0,
      scaleZ: 0.1,
    });
    activityIndicatorMapper.toInfrastructure.mockReturnValue(indicatorBot);
    getBotMock.mockReturnValue(makeOwnerBot(BiblePiece.StackChapter));
    makeAdapter().updateIndicatorPosition(
      makeActivityIndicator(),
      makePieceContainer()
    );
    expect(setTagMock).toHaveBeenCalledWith(
      indicatorBot,
      "scene3dX",
      expect.any(Number)
    );
  });

  it("sets dimension y and z tags", () => {
    const indicatorBot = makeIndicatorBot({
      ownerBotId: "owner-id",
      index: 0,
      scaleZ: 0.1,
    });
    activityIndicatorMapper.toInfrastructure.mockReturnValue(indicatorBot);
    getBotMock.mockReturnValue(makeOwnerBot(BiblePiece.StackChapter));
    makeAdapter().updateIndicatorPosition(
      makeActivityIndicator(),
      makePieceContainer()
    );
    expect(setTagMock).toHaveBeenCalledWith(
      indicatorBot,
      "scene3dY",
      expect.any(Number)
    );
    expect(setTagMock).toHaveBeenCalledWith(
      indicatorBot,
      "scene3dZ",
      expect.any(Number)
    );
  });

  it("sets 'initialPosition' tag with a Vector3 instance", () => {
    const indicatorBot = makeIndicatorBot({
      ownerBotId: "owner-id",
      index: 0,
      scaleZ: 0.1,
    });
    activityIndicatorMapper.toInfrastructure.mockReturnValue(indicatorBot);
    getBotMock.mockReturnValue(makeOwnerBot(BiblePiece.StackChapter));
    makeAdapter().updateIndicatorPosition(
      makeActivityIndicator(),
      makePieceContainer()
    );
    expect(setTagMock).toHaveBeenCalledWith(
      indicatorBot,
      "initialPosition",
      expect.any(Vec3)
    );
  });

  it("uses byID to look up the ownerBot by ownerBotId", () => {
    const indicatorBot = makeIndicatorBot({ ownerBotId: "target-owner" });
    activityIndicatorMapper.toInfrastructure.mockReturnValue(indicatorBot);
    getBotMock.mockReturnValue(undefined);
    try {
      makeAdapter().updateIndicatorPosition(
        makeActivityIndicator(),
        makePieceContainer()
      );
    } catch {}
    expect(byIDMock).toHaveBeenCalledWith("target-owner");
  });

  it("works with LayoutBook owner (uses grounded book strategy)", () => {
    const indicatorBot = makeIndicatorBot({
      ownerBotId: "owner-id",
      index: 1,
      scaleZ: 0.1,
    });
    activityIndicatorMapper.toInfrastructure.mockReturnValue(indicatorBot);
    getBotMock.mockReturnValue(makeOwnerBot(BiblePiece.LayoutBook));
    expect(() =>
      makeAdapter().updateIndicatorPosition(
        makeActivityIndicator(),
        makePieceContainer()
      )
    ).not.toThrow();
    expect(setTagMock).toHaveBeenCalledTimes(4);
  });
});

// ─── getIndicatorsByPieceId ───────────────────────────────────────────────────

describe("getIndicatorsByPieceId", () => {
  it("delegates to botsRepositoryPort.getIndicatorBotsByPieceId", () => {
    const repo = makeBotsRepository();
    makeAdapter(
      makePooler(),
      makeConfigProvider(),
      repo
    ).getIndicatorsByPieceId("piece-id");
    expect(repo.getIndicatorBotsByPieceId).toHaveBeenCalledWith("piece-id");
  });

  it("maps each bot via ActivityIndicatorMapper.toDomain", () => {
    const bot = makeIndicatorBot();
    const repo = makeBotsRepository();
    repo.getIndicatorBotsByPieceId.mockReturnValue([bot]);
    const domainIndicator = makeDomainIndicator();
    activityIndicatorMapper.toDomain.mockReturnValue(domainIndicator);
    const result = makeAdapter(
      makePooler(),
      makeConfigProvider(),
      repo
    ).getIndicatorsByPieceId("p");
    expect(activityIndicatorMapper.toDomain).toHaveBeenCalledWith(bot);
    expect(result).toContain(domainIndicator);
  });

  it("returns an empty array when no bots are found", () => {
    expect(makeAdapter().getIndicatorsByPieceId("p")).toEqual([]);
  });

  it("returns one indicator per bot", () => {
    const repo = makeBotsRepository();
    repo.getIndicatorBotsByPieceId.mockReturnValue([
      makeIndicatorBot(),
      makeIndicatorBot({ id: "b2" }),
    ]);
    activityIndicatorMapper.toDomain.mockReturnValue(makeDomainIndicator());
    const result = makeAdapter(
      makePooler(),
      makeConfigProvider(),
      repo
    ).getIndicatorsByPieceId("p");
    expect(result).toHaveLength(2);
  });
});

// ─── getIndicatorsByPieceDataId ───────────────────────────────────────────────

describe("getIndicatorsByPieceDataId", () => {
  it("delegates to botsRepositoryPort.getIndicatorBotsByPieceDataId", () => {
    const repo = makeBotsRepository();
    makeAdapter(
      makePooler(),
      makeConfigProvider(),
      repo
    ).getIndicatorsByPieceDataId("data-id");
    expect(repo.getIndicatorBotsByPieceDataId).toHaveBeenCalledWith("data-id");
  });

  it("maps each bot via ActivityIndicatorMapper.toDomain", () => {
    const bot = makeIndicatorBot();
    const repo = makeBotsRepository();
    repo.getIndicatorBotsByPieceDataId.mockReturnValue([bot]);
    const domainIndicator = makeDomainIndicator();
    activityIndicatorMapper.toDomain.mockReturnValue(domainIndicator);
    const result = makeAdapter(
      makePooler(),
      makeConfigProvider(),
      repo
    ).getIndicatorsByPieceDataId("d");
    expect(activityIndicatorMapper.toDomain).toHaveBeenCalledWith(bot);
    expect(result).toContain(domainIndicator);
  });

  it("returns an empty array when no bots are found", () => {
    expect(makeAdapter().getIndicatorsByPieceDataId("d")).toEqual([]);
  });
});

// ─── updateIndicatorPosition — grounded strategy — index undefined ─────────────

describe("updateIndicatorPosition — grounded strategy — index undefined", () => {
  it("throws when indicatorBot.tags.index is undefined for StackChapter owner", () => {
    const indicatorBot = makeIndicatorBot({
      ownerBotId: "owner-id",
      index: undefined,
    });
    activityIndicatorMapper.toInfrastructure.mockReturnValue(indicatorBot);
    getBotMock.mockReturnValue(makeOwnerBot(BiblePiece.StackChapter));
    expect(() =>
      makeAdapter().updateIndicatorPosition(
        makeActivityIndicator(),
        makePieceContainer()
      )
    ).toThrow(
      "ActivityIndicatorsAdapter: indicatorBot.tags.index not defined at createPositionGroundedStrategy"
    );
  });
});

// ─── updateIndicatorPosition — InfoLabelTransformer owner (labelPositionStrategy) ─

describe("updateIndicatorPosition — InfoLabelTransformer owner (labelPositionStrategy)", () => {
  const makeLabelTextBot = (tagOverrides: any = {}): any => ({
    id: "label-text-bot-1",
    link: "",
    tags: {
      type: "InfoLabelText",
      initialPosition: { x: 1, y: 2, z: 0 },
      scaleX: 2,
      scaleY: 1,
      scaleZ: 0,
      ...tagOverrides,
    },
    masks: {},
    links: {},
    vars: {},
    raw: {},
    changes: {},
    maskChanges: {},
  });

  beforeEach(() => {
    getBotMock.mockReturnValue(makeOwnerBot(BiblePiece.InfoLabelTransformer));
    activityIndicatorMapper.toInfrastructure.mockReturnValue(
      makeIndicatorBot({ ownerBotId: "owner-id", indicatorType: "regular" })
    );
  });

  it("throws when container is not an InfoLabelData instance", () => {
    expect(() =>
      makeAdapter().updateIndicatorPosition(
        makeActivityIndicator(),
        makePieceContainer()
      )
    ).toThrow(
      "ActivityIndicatorsAdapter: container must be an instance of InfoLabelData at labelPositionStrategy"
    );
  });

  it("throws when InfoLabelTextMapper.toInfrastructure returns undefined", () => {
    infoLabelTextMapper.toInfrastructure.mockReturnValue(undefined);
    expect(() =>
      makeAdapter().updateIndicatorPosition(
        makeActivityIndicator(),
        makeInfoLabelContainer()
      )
    ).toThrow(
      "ActivityIndicatorsAdapter: labelTextBot not found at labelPositionStrategy"
    );
  });

  it("throws when labelTextBot has no initialPosition", () => {
    infoLabelTextMapper.toInfrastructure.mockReturnValue(
      makeLabelTextBot({ initialPosition: undefined })
    );
    expect(() =>
      makeAdapter().updateIndicatorPosition(
        makeActivityIndicator(),
        makeInfoLabelContainer()
      )
    ).toThrow(
      "ActivityIndicatorsAdapter: piecePosition not defined at labelPositionStrategy"
    );
  });

  it("throws when indicatorBot.tags.index is undefined", () => {
    activityIndicatorMapper.toInfrastructure.mockReturnValue(
      makeIndicatorBot({
        ownerBotId: "owner-id",
        index: undefined,
        indicatorType: "regular",
      })
    );
    infoLabelTextMapper.toInfrastructure.mockReturnValue(makeLabelTextBot());
    expect(() =>
      makeAdapter().updateIndicatorPosition(
        makeActivityIndicator(),
        makeInfoLabelContainer()
      )
    ).toThrow(
      "ActivityIndicatorsAdapter: indicatorBot.tags.index not defined at labelPositionStrategy"
    );
  });

  it("sets position tags successfully when all inputs are valid (indicatorType='regular')", () => {
    infoLabelTextMapper.toInfrastructure.mockReturnValue(makeLabelTextBot());
    makeAdapter().updateIndicatorPosition(
      makeActivityIndicator(),
      makeInfoLabelContainer()
    );
    expect(setTagMock).toHaveBeenCalledTimes(4);
  });

  it("sets position tags successfully when indicatorType='extraContent'", () => {
    activityIndicatorMapper.toInfrastructure.mockReturnValue(
      makeIndicatorBot({
        ownerBotId: "owner-id",
        index: 1,
        indicatorType: "extraContent",
      })
    );
    infoLabelTextMapper.toInfrastructure.mockReturnValue(makeLabelTextBot());
    makeAdapter().updateIndicatorPosition(
      makeActivityIndicator(),
      makeInfoLabelContainer()
    );
    expect(setTagMock).toHaveBeenCalledTimes(4);
  });

  it("sets the initialPosition tag with a Vector3 instance", () => {
    infoLabelTextMapper.toInfrastructure.mockReturnValue(makeLabelTextBot());
    makeAdapter().updateIndicatorPosition(
      makeActivityIndicator(),
      makeInfoLabelContainer()
    );
    expect(setTagMock).toHaveBeenCalledWith(
      expect.anything(),
      "initialPosition",
      expect.any(Vec3)
    );
  });
});
