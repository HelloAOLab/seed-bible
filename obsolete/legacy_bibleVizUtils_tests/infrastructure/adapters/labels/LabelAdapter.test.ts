import { LabelAdapter } from "bibleVizUtils.infrastructure.adapters.labels.LabelAdapter";
import { PieceMapper } from "bibleVizUtils.infrastructure.mappers.PieceMapper";
import { InfoLabelTransformerMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTransformerMapper";
import { InfoLabelTailMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTailMapper";
import { InfoLabelDateMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelDateMapper";
import {
  LabelTranslucencyModes,
  LabelDateFormat,
  LabelPosition,
} from "bibleVizUtils.domain.models.label";
import { BiblePiece } from "bibleVizUtils.domain.models.canvas";

// ─── module mocks ─────────────────────────────────────────────────────────────

jest.mock("bibleVizUtils.infrastructure.functions.layout", () => ({
  GetDialogBotScaleY: jest.fn().mockReturnValue({ scaleY: 2 }),
  GetLabelFormAddress: jest.fn().mockReturnValue("form://dialog"),
  ComputeInfoLabelTransformerDesiredPosition: jest
    .fn()
    .mockReturnValue({ x: 1, y: 2, z: 3 }),
  ComputeInfoLabelOffset: jest.fn().mockReturnValue({ x: 0.1, y: 0.2, z: 0.3 }),
  ComputeInfoLabelTailRotationZ: jest.fn().mockReturnValue(45),
  ComputeInfoLabelTailOffset: jest
    .fn()
    .mockReturnValue({ x: 0.5, y: 0.6, z: 0.7 }),
  ComputeInfoLabelDateOffset: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
}));

jest.mock("bibleVizUtils.infrastructure.functions.casualos", () => ({
  GetBotScales: jest.fn().mockReturnValue({ x: 1, y: 1, z: 1 }),
}));

jest.mock("bibleVizUtils.infrastructure.mappers.PieceMapper", () => ({
  PieceMapper: {
    toInfrastructure: jest.fn(),
    toDomain: jest
      .fn()
      .mockImplementation((bot: any) => ({ id: bot.id, type: bot.tags?.type })),
  },
}));

jest.mock(
  "bibleVizUtils.infrastructure.mappers.InfoLabelTransformerMapper",
  () => ({
    InfoLabelTransformerMapper: { toInfrastructure: jest.fn() },
  })
);

jest.mock("bibleVizUtils.infrastructure.mappers.InfoLabelTailMapper", () => ({
  InfoLabelTailMapper: { toInfrastructure: jest.fn() },
}));

jest.mock("bibleVizUtils.infrastructure.mappers.InfoLabelDateMapper", () => ({
  InfoLabelDateMapper: { toInfrastructure: jest.fn() },
}));

// ─── mock aliases ─────────────────────────────────────────────────────────────

const pieceMapperToInfra = PieceMapper.toInfrastructure as jest.Mock;
const pieceMapperToDomain = PieceMapper.toDomain as jest.Mock;
const transformerMapperToInfra =
  InfoLabelTransformerMapper.toInfrastructure as jest.Mock;
const tailMapperToInfra = InfoLabelTailMapper.toInfrastructure as jest.Mock;
const dateMapperToInfra = InfoLabelDateMapper.toInfrastructure as jest.Mock;

// ─── globals ──────────────────────────────────────────────────────────────────

class Vec3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0
  ) {}
  add(other: Vec3) {
    return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
  }
}

class Vec2 {
  constructor(
    public x = 0,
    public y = 0
  ) {}
}

let applyModMock: jest.Mock;
let setTagMaskMock: jest.Mock;
let infoLabelTextMapper: { toInfrastructure: jest.Mock };

beforeEach(() => {
  applyModMock = jest.fn();
  setTagMaskMock = jest.fn();
  infoLabelTextMapper = { toInfrastructure: jest.fn() };

  (globalThis as any).Vector3 = Vec3;
  (globalThis as any).Vector2 = Vec2;
  (globalThis as any).os = {
    ...((globalThis as any).os ?? {}),
    getCurrentDimension: jest.fn().mockReturnValue("scene3d"),
  };
  (globalThis as any).getBot = jest.fn().mockReturnValue(null);
  (globalThis as any).byID = jest.fn().mockReturnValue("id-query");
  (globalThis as any).getBotPosition = jest
    .fn()
    .mockReturnValue(new Vec3(0, 0, 0));
  (globalThis as any).getID = jest
    .fn()
    .mockImplementation((bot: any) => bot?.id ?? "");
  (globalThis as any).applyMod = applyModMock;
  (globalThis as any).setTagMask = setTagMaskMock;
});

afterEach(() => {
  delete (globalThis as any).Vector3;
  delete (globalThis as any).Vector2;
  delete (globalThis as any).getBot;
  delete (globalThis as any).byID;
  delete (globalThis as any).getBotPosition;
  delete (globalThis as any).getID;
  delete (globalThis as any).applyMod;
  delete (globalThis as any).setTagMask;
  jest.clearAllMocks();
});

// ─── factories ────────────────────────────────────────────────────────────────

const makePieceBot = (id = "piece-bot-1"): any => ({
  id,
  link: "",
  tags: { type: "StackBook" },
  masks: {},
  links: {},
  vars: {},
  raw: {},
  changes: {},
  maskChanges: {},
});

const makeInfraBot = (id: string, type = "InfoLabelTransformer"): any => ({
  id,
  link: "",
  tags: { type },
  masks: {},
  links: {},
  vars: {},
  raw: {},
  changes: {},
  maskChanges: {},
});

const makeObjectPooler = (): any => ({
  getObject: jest
    .fn()
    .mockImplementation((key: string) => makeInfraBot(`${key}-bot`, key)),
  releaseObject: jest.fn(),
});

const makeLabelConfigProvider = (): any => ({
  getFontData: jest.fn().mockReturnValue({ size: 12, lineHeight: 1.2 }),
  getDialogBoxFormAddresses: jest.fn().mockReturnValue({}),
  getDateConfig: jest.fn().mockImplementation((key: string) => {
    if (key === "relativeDateScales" || key === "absoluteDateScales")
      return { x: 1, y: 1 };
    return "form://date";
  }),
});

const makeDimensionProvider = (dimension = "scene3d") => ({
  getDimension: jest.fn().mockReturnValue(dimension),
});

const makeAdapter = (
  objectPooler = makeObjectPooler(),
  labelConfigProvider = makeLabelConfigProvider(),
  dimensionProvider = makeDimensionProvider()
) =>
  new LabelAdapter({
    objectPooler,
    labelConfigProviderPort: labelConfigProvider,
    dimensionProviderPort: dimensionProvider,
    infoLabelTextMapperPort: infoLabelTextMapper,
  });

const makeSpawnParams = (overrides: Record<string, unknown> = {}): any => ({
  piece: { id: "piece-1", type: "StackBook" },
  label: "Genesis",
  color: "#ffffff",
  labelColor: "#000000",
  labelPositioning: LabelPosition.RightSided,
  translucencyMode: LabelTranslucencyModes.Solid,
  dateFormat: LabelDateFormat.Absolute,
  ...overrides,
});

const makeDespawnData = (overrides: Record<string, unknown> = {}): any => ({
  transformer: { id: "transformer-1", type: "InfoLabelTransformer" },
  tail: { id: "tail-1", type: "InfoLabelTail" },
  label: { id: "label-1", type: "InfoLabelText" },
  date: undefined,
  ...overrides,
});

/** Returns the second argument (mod object) from the applyMod call made for a specific bot. */
const getAppliedModFor = (bot: any): Record<string, unknown> | undefined =>
  applyModMock.mock.calls.find(([b]) => b === bot)?.[1];

// ─── spawnLabel ───────────────────────────────────────────────────────────────

describe("spawnLabel", () => {
  describe("guard — pieceBot not found", () => {
    it("throws when PieceMapper.toInfrastructure returns undefined", () => {
      pieceMapperToInfra.mockReturnValue(undefined);
      expect(() => makeAdapter().spawnLabel(makeSpawnParams())).toThrow(
        "LabelAdapter: pieceBot not found at spawnLabelForPiece"
      );
    });
  });

  describe("object pool — getObject calls", () => {
    beforeEach(() => {
      pieceMapperToInfra.mockReturnValue(makePieceBot());
    });

    it("calls getObject for InfoLabelTransformer", () => {
      const pooler = makeObjectPooler();
      makeAdapter(pooler).spawnLabel(makeSpawnParams());
      expect(pooler.getObject).toHaveBeenCalledWith(
        BiblePiece.InfoLabelTransformer
      );
    });

    it("calls getObject for InfoLabelText", () => {
      const pooler = makeObjectPooler();
      makeAdapter(pooler).spawnLabel(makeSpawnParams());
      expect(pooler.getObject).toHaveBeenCalledWith(BiblePiece.InfoLabelText);
    });

    it("calls getObject for InfoLabelTail", () => {
      const pooler = makeObjectPooler();
      makeAdapter(pooler).spawnLabel(makeSpawnParams());
      expect(pooler.getObject).toHaveBeenCalledWith(BiblePiece.InfoLabelTail);
    });

    it("calls getObject for InfoLabelDate when date param is provided", () => {
      const pooler = makeObjectPooler();
      makeAdapter(pooler).spawnLabel(makeSpawnParams({ date: "2024-01-01" }));
      expect(pooler.getObject).toHaveBeenCalledWith(BiblePiece.InfoLabelDate);
    });

    it("does not call getObject for InfoLabelDate when date param is absent", () => {
      const pooler = makeObjectPooler();
      makeAdapter(pooler).spawnLabel(makeSpawnParams());
      expect(pooler.getObject).not.toHaveBeenCalledWith(
        BiblePiece.InfoLabelDate
      );
    });
  });

  describe("return value", () => {
    beforeEach(() => {
      pieceMapperToInfra.mockReturnValue(makePieceBot());
    });

    it("returns a transformer piece", () => {
      const result = makeAdapter().spawnLabel(makeSpawnParams());
      expect(result.transformer).toBeDefined();
    });

    it("returns a tail piece", () => {
      const result = makeAdapter().spawnLabel(makeSpawnParams());
      expect(result.tail).toBeDefined();
    });

    it("returns a label piece", () => {
      const result = makeAdapter().spawnLabel(makeSpawnParams());
      expect(result.label).toBeDefined();
    });

    it("returns date=undefined when no date param", () => {
      const result = makeAdapter().spawnLabel(makeSpawnParams());
      expect(result.date).toBeUndefined();
    });

    it("returns a date piece when date param is provided", () => {
      pieceMapperToDomain
        .mockReturnValueOnce({ id: "t", type: "InfoLabelTransformer" })
        .mockReturnValueOnce({ id: "ta", type: "InfoLabelTail" })
        .mockReturnValueOnce({ id: "l", type: "InfoLabelText" })
        .mockReturnValueOnce({ id: "d", type: "InfoLabelDate" });

      const result = makeAdapter().spawnLabel(
        makeSpawnParams({ date: "2024-01-01" })
      );
      expect(result.date).toBeDefined();
    });

    it("transformer piece id comes from the pooled bot", () => {
      const pooler = makeObjectPooler();
      const transformerBot = makeInfraBot(
        "transformer-bot-id",
        "InfoLabelTransformer"
      );
      pooler.getObject.mockImplementation((key: string) => {
        if (key === BiblePiece.InfoLabelTransformer) return transformerBot;
        return makeInfraBot(`${key}-bot`, key);
      });
      pieceMapperToDomain.mockImplementation((bot: any) => ({
        id: bot.id,
        type: bot.tags?.type,
      }));
      const result = makeAdapter(pooler).spawnLabel(makeSpawnParams());
      expect(result.transformer.id).toBe("transformer-bot-id");
    });
  });

  describe("translucency mode — targetOpacity on transformer mod", () => {
    beforeEach(() => {
      pieceMapperToInfra.mockReturnValue(makePieceBot());
    });

    it("Solid mode sets targetOpacity=1 on the transformer mod", () => {
      const pooler = makeObjectPooler();
      const transformerBot = makeInfraBot("t-bot", "InfoLabelTransformer");
      pooler.getObject.mockImplementation((key: string) =>
        key === BiblePiece.InfoLabelTransformer
          ? transformerBot
          : makeInfraBot(`${key}-bot`, key)
      );
      makeAdapter(pooler).spawnLabel(
        makeSpawnParams({ translucencyMode: LabelTranslucencyModes.Solid })
      );
      expect(getAppliedModFor(transformerBot)?.targetOpacity).toBe(1);
    });

    it("Faded mode sets targetOpacity=0.5 on the transformer mod", () => {
      const pooler = makeObjectPooler();
      const transformerBot = makeInfraBot("t-bot", "InfoLabelTransformer");
      pooler.getObject.mockImplementation((key: string) =>
        key === BiblePiece.InfoLabelTransformer
          ? transformerBot
          : makeInfraBot(`${key}-bot`, key)
      );
      makeAdapter(pooler).spawnLabel(
        makeSpawnParams({ translucencyMode: LabelTranslucencyModes.Faded })
      );
      expect(getAppliedModFor(transformerBot)?.targetOpacity).toBe(0.5);
    });
  });

  describe("isInteractable — pointableDefault on transformer mod", () => {
    beforeEach(() => {
      pieceMapperToInfra.mockReturnValue(makePieceBot());
    });

    it("defaults isInteractable to true → pointableDefault=true", () => {
      const pooler = makeObjectPooler();
      const transformerBot = makeInfraBot("t-bot", "InfoLabelTransformer");
      pooler.getObject.mockImplementation((key: string) =>
        key === BiblePiece.InfoLabelTransformer
          ? transformerBot
          : makeInfraBot(`${key}-bot`, key)
      );
      makeAdapter(pooler).spawnLabel(makeSpawnParams());
      expect(getAppliedModFor(transformerBot)?.pointableDefault).toBe(true);
    });

    it("isInteractable=false sets pointableDefault=false", () => {
      const pooler = makeObjectPooler();
      const transformerBot = makeInfraBot("t-bot", "InfoLabelTransformer");
      pooler.getObject.mockImplementation((key: string) =>
        key === BiblePiece.InfoLabelTransformer
          ? transformerBot
          : makeInfraBot(`${key}-bot`, key)
      );
      makeAdapter(pooler).spawnLabel(
        makeSpawnParams({ isInteractable: false })
      );
      expect(getAppliedModFor(transformerBot)?.pointableDefault).toBe(false);
    });
  });
});

// ─── despawnLabel ─────────────────────────────────────────────────────────────

describe("despawnLabel", () => {
  const makeValidMappers = () => {
    transformerMapperToInfra.mockReturnValue(makeInfraBot("t-bot"));
    tailMapperToInfra.mockReturnValue(makeInfraBot("tail-bot"));
    infoLabelTextMapper.toInfrastructure.mockReturnValue(
      makeInfraBot("text-bot")
    );
  };

  describe("guard throws", () => {
    it("throws when transformer bot is not found", () => {
      transformerMapperToInfra.mockReturnValue(undefined);
      tailMapperToInfra.mockReturnValue(makeInfraBot("tail-bot"));
      infoLabelTextMapper.toInfrastructure.mockReturnValue(
        makeInfraBot("text-bot")
      );
      expect(() => makeAdapter().despawnLabel(makeDespawnData())).toThrow(
        "LabelAdapter: required bots not found at despawnLabelForPiece."
      );
    });

    it("throws when tail bot is not found", () => {
      transformerMapperToInfra.mockReturnValue(makeInfraBot("t-bot"));
      tailMapperToInfra.mockReturnValue(undefined);
      infoLabelTextMapper.toInfrastructure.mockReturnValue(
        makeInfraBot("text-bot")
      );
      expect(() => makeAdapter().despawnLabel(makeDespawnData())).toThrow(
        "LabelAdapter: required bots not found at despawnLabelForPiece."
      );
    });

    it("throws when text bot is not found", () => {
      transformerMapperToInfra.mockReturnValue(makeInfraBot("t-bot"));
      tailMapperToInfra.mockReturnValue(makeInfraBot("tail-bot"));
      infoLabelTextMapper.toInfrastructure.mockReturnValue(undefined);
      expect(() => makeAdapter().despawnLabel(makeDespawnData())).toThrow(
        "LabelAdapter: required bots not found at despawnLabelForPiece."
      );
    });

    it("throws when data.date exists but date bot is not found", () => {
      makeValidMappers();
      dateMapperToInfra.mockReturnValue(undefined);
      const data = makeDespawnData({
        date: { id: "date-1", type: "InfoLabelDate" },
      });
      expect(() => makeAdapter().despawnLabel(data)).toThrow(
        "LabelAdapter: date not found at despawnLabelForPiece."
      );
    });
  });

  describe("object pool — releaseObject calls", () => {
    it("releases the transformer with InfoLabelTransformer key", () => {
      makeValidMappers();
      const transformerBot = makeInfraBot("t-bot");
      transformerMapperToInfra.mockReturnValue(transformerBot);
      const pooler = makeObjectPooler();
      makeAdapter(pooler).despawnLabel(makeDespawnData());
      expect(pooler.releaseObject).toHaveBeenCalledWith(
        transformerBot,
        BiblePiece.InfoLabelTransformer
      );
    });

    it("releases the tail with InfoLabelTail key", () => {
      makeValidMappers();
      const tailBot = makeInfraBot("tail-bot");
      tailMapperToInfra.mockReturnValue(tailBot);
      const pooler = makeObjectPooler();
      makeAdapter(pooler).despawnLabel(makeDespawnData());
      expect(pooler.releaseObject).toHaveBeenCalledWith(
        tailBot,
        BiblePiece.InfoLabelTail
      );
    });

    it("releases the text with InfoLabelText key", () => {
      makeValidMappers();
      const textBot = makeInfraBot("text-bot");
      infoLabelTextMapper.toInfrastructure.mockReturnValue(textBot);
      const pooler = makeObjectPooler();
      makeAdapter(pooler).despawnLabel(makeDespawnData());
      expect(pooler.releaseObject).toHaveBeenCalledWith(
        textBot,
        BiblePiece.InfoLabelText
      );
    });

    it("releases the date bot with InfoLabelDate key when data.date is present", () => {
      makeValidMappers();
      const dateBot = makeInfraBot("date-bot");
      dateMapperToInfra.mockReturnValue(dateBot);
      const pooler = makeObjectPooler();
      const data = makeDespawnData({
        date: { id: "date-1", type: "InfoLabelDate" },
      });
      makeAdapter(pooler).despawnLabel(data);
      expect(pooler.releaseObject).toHaveBeenCalledWith(
        dateBot,
        BiblePiece.InfoLabelDate
      );
    });

    it("does not release InfoLabelDate when data.date is undefined", () => {
      makeValidMappers();
      const pooler = makeObjectPooler();
      makeAdapter(pooler).despawnLabel(makeDespawnData());
      const dateCalls = pooler.releaseObject.mock.calls.filter(
        ([, key]: [any, string]) => key === BiblePiece.InfoLabelDate
      );
      expect(dateCalls).toHaveLength(0);
    });

    it("releases all three required bots in one call", () => {
      makeValidMappers();
      const pooler = makeObjectPooler();
      makeAdapter(pooler).despawnLabel(makeDespawnData());
      expect(pooler.releaseObject).toHaveBeenCalledTimes(3);
    });

    it("releases four bots when data.date is present", () => {
      makeValidMappers();
      dateMapperToInfra.mockReturnValue(makeInfraBot("date-bot"));
      const pooler = makeObjectPooler();
      const data = makeDespawnData({
        date: { id: "date-1", type: "InfoLabelDate" },
      });
      makeAdapter(pooler).despawnLabel(data);
      expect(pooler.releaseObject).toHaveBeenCalledTimes(4);
    });
  });
});
