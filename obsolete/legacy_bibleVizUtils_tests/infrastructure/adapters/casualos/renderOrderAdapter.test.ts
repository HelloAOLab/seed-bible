import { RenderOrderAdapter } from "bibleVizUtils.infrastructure.adapters.casualos.renderOrderAdapter";
import { DistanceBetweenBotAndCamera } from "bibleVizUtils.infrastructure.functions.casualos";
import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceBot } from "bibleVizUtils.infrastructure.models.casualos";

jest.mock("bibleVizUtils.infrastructure.functions.casualos", () => ({
  DistanceBetweenBotAndCamera: jest.fn().mockReturnValue(0),
}));

const distanceMock = DistanceBetweenBotAndCamera as jest.Mock;

// ─── globals ──────────────────────────────────────────────────────────────────

let setTagMaskMock: jest.Mock;

beforeEach(() => {
  setTagMaskMock = jest.fn();
  (globalThis as any).setTagMask = setTagMaskMock;
});

afterEach(() => {
  delete (globalThis as any).setTagMask;
  jest.clearAllMocks();
});

// ─── factories ────────────────────────────────────────────────────────────────

const DIMENSION = "scene3d";
const Z_KEY = `${DIMENSION}Z`;

const makePiece = (id = "p1"): Piece => ({ id, type: "StackBook" }) as any;

const makeBot = (
  id: string,
  z: { masks?: number; tags?: number } = {}
): PieceBot =>
  ({
    id,
    link: "",
    tags: {
      type: "StackBook",
      ...(z.tags !== undefined ? { [Z_KEY]: z.tags } : {}),
    },
    masks: {
      ...(z.masks !== undefined ? { [Z_KEY]: z.masks } : {}),
    },
    links: {},
    vars: {},
    raw: {},
    changes: {},
    maskChanges: {},
  }) as any;

const makeDimensionPort = (dimension = DIMENSION) => ({
  getCurrentDimension: jest.fn().mockReturnValue(dimension),
});

const makePieceMapperPort = (mapping: Map<string, PieceBot | undefined>) => ({
  toInfrastructure: jest
    .fn()
    .mockImplementation((piece: Piece) => mapping.get(piece.id)),
});

const makeAdapter = (
  mapping: Map<string, PieceBot | undefined> = new Map(),
  dimensionPort = makeDimensionPort()
) =>
  new RenderOrderAdapter({
    dimensionProviderPort: dimensionPort,
    pieceMapperPort: makePieceMapperPort(mapping),
  });

/** Returns the formRenderOrder value that was set on a specific bot. */
const getRenderOrderFor = (bot: PieceBot): number | undefined =>
  setTagMaskMock.mock.calls.find(([b]) => b === bot)?.[2];

// ─── setSortedRenderOrder ─────────────────────────────────────────────────────

describe("setSortedRenderOrder", () => {
  // ─── filtering ───────────────────────────────────────────────────────────────

  it("does not call setTagMask when pieces array is empty", () => {
    makeAdapter().setSortedRenderOrder([]);
    expect(setTagMaskMock).not.toHaveBeenCalled();
  });

  it("does not call setTagMask when all pieces map to undefined", () => {
    const piece = makePiece("p1");
    const mapping = new Map([["p1", undefined]]);
    makeAdapter(mapping).setSortedRenderOrder([piece]);
    expect(setTagMaskMock).not.toHaveBeenCalled();
  });

  it("skips undefined bots while still processing valid ones", () => {
    const pieceA = makePiece("a");
    const pieceB = makePiece("b");
    const botB = makeBot("b");
    const mapping = new Map<string, PieceBot | undefined>([
      ["a", undefined],
      ["b", botB],
    ]);
    makeAdapter(mapping).setSortedRenderOrder([pieceA, pieceB]);
    expect(setTagMaskMock).toHaveBeenCalledTimes(1);
  });

  // ─── formRenderOrder assignment ───────────────────────────────────────────────

  it("calls setTagMask with 'formRenderOrder' as the tag name", () => {
    const piece = makePiece();
    const bot = makeBot("b1");
    makeAdapter(new Map([["p1", bot]])).setSortedRenderOrder([piece]);
    expect(setTagMaskMock).toHaveBeenCalledWith(
      bot,
      "formRenderOrder",
      expect.any(Number)
    );
  });

  it("assigns -1 to the single bot when there is only one piece", () => {
    const piece = makePiece();
    const bot = makeBot("b1");
    makeAdapter(new Map([["p1", bot]])).setSortedRenderOrder([piece]);
    expect(getRenderOrderFor(bot)).toBe(-1);
  });

  it("assigns consecutive negative integers starting at -1", () => {
    const pieces = [makePiece("p1"), makePiece("p2"), makePiece("p3")];
    const bots = [makeBot("b1"), makeBot("b2"), makeBot("b3")];
    const mapping = new Map<string, PieceBot | undefined>([
      ["p1", bots[0]],
      ["p2", bots[1]],
      ["p3", bots[2]],
    ]);
    makeAdapter(mapping).setSortedRenderOrder(pieces);
    const assigned = setTagMaskMock.mock.calls
      .map(([, , v]) => v)
      .sort((a, b) => b - a);
    expect(assigned).toEqual([-1, -2, -3]);
  });

  // ─── sorting by Z position ────────────────────────────────────────────────────

  it("assigns a less negative render order to the bot with lower Z", () => {
    const pieceA = makePiece("a");
    const pieceB = makePiece("b");
    const botLowZ = makeBot("low", { tags: 0 });
    const botHighZ = makeBot("high", { tags: 10 });
    const mapping = new Map<string, PieceBot | undefined>([
      ["a", botLowZ],
      ["b", botHighZ],
    ]);
    makeAdapter(mapping).setSortedRenderOrder([pieceA, pieceB]);
    expect(getRenderOrderFor(botLowZ)!).toBeGreaterThan(
      getRenderOrderFor(botHighZ)!
    );
  });

  it("assigns -1 (least negative) to the bot with the lowest Z", () => {
    const pieceA = makePiece("a");
    const pieceB = makePiece("b");
    const botLowZ = makeBot("low", { tags: 0 });
    const botHighZ = makeBot("high", { tags: 5 });
    const mapping = new Map<string, PieceBot | undefined>([
      ["a", botLowZ],
      ["b", botHighZ],
    ]);
    makeAdapter(mapping).setSortedRenderOrder([pieceA, pieceB]);
    expect(getRenderOrderFor(botLowZ)).toBe(-1);
    expect(getRenderOrderFor(botHighZ)).toBe(-2);
  });

  it("reads Z from masks in priority over tags", () => {
    const pieceA = makePiece("a");
    const pieceB = makePiece("b");
    // botA: masks Z=20 overrides tags Z=0 → actually has Z=20
    const botA = makeBot("a", { masks: 20, tags: 0 });
    // botB: no masks, tags Z=5
    const botB = makeBot("b", { tags: 5 });
    const mapping = new Map<string, PieceBot | undefined>([
      ["a", botA],
      ["b", botB],
    ]);
    makeAdapter(mapping).setSortedRenderOrder([pieceA, pieceB]);
    // botB (Z=5) < botA (Z=20) → botB gets -1, botA gets -2
    expect(getRenderOrderFor(botB)).toBe(-1);
    expect(getRenderOrderFor(botA)).toBe(-2);
  });

  it("defaults Z to 0 when neither masks nor tags contain the Z key", () => {
    const pieceA = makePiece("a");
    const pieceB = makePiece("b");
    const botNoZ = makeBot("noZ"); // Z defaults to 0
    const botWithZ = makeBot("withZ", { tags: 5 }); // Z=5
    const mapping = new Map<string, PieceBot | undefined>([
      ["a", botNoZ],
      ["b", botWithZ],
    ]);
    makeAdapter(mapping).setSortedRenderOrder([pieceA, pieceB]);
    // botNoZ (Z=0) < botWithZ (Z=5) → botNoZ gets -1
    expect(getRenderOrderFor(botNoZ)).toBe(-1);
  });

  it("uses the dimension from getCurrentDimension to construct the Z key", () => {
    const CUSTOM_DIM = "portal3d";
    const pieceA = makePiece("a");
    const pieceB = makePiece("b");
    // bots use the custom dimension key
    const botLow: PieceBot = {
      ...makeBot("a"),
      tags: { type: "StackBook", [`${CUSTOM_DIM}Z`]: 0 } as any,
    };
    const botHigh: PieceBot = {
      ...makeBot("b"),
      tags: { type: "StackBook", [`${CUSTOM_DIM}Z`]: 10 } as any,
    };
    const mapping = new Map<string, PieceBot | undefined>([
      ["a", botLow],
      ["b", botHigh],
    ]);
    makeAdapter(mapping, makeDimensionPort(CUSTOM_DIM)).setSortedRenderOrder([
      pieceA,
      pieceB,
    ]);
    expect(getRenderOrderFor(botLow)).toBe(-1);
    expect(getRenderOrderFor(botHigh)).toBe(-2);
  });

  // ─── tie-breaking by camera distance ─────────────────────────────────────────

  it("when Z values are equal, closer bot (smaller distance) gets more negative render order", () => {
    const pieceA = makePiece("a");
    const pieceB = makePiece("b");
    const botClose = makeBot("close"); // Z=0
    const botFar = makeBot("far"); // Z=0
    distanceMock.mockImplementation(({ bot }: { bot: PieceBot }) =>
      bot.id === "close" ? 5 : 20
    );
    const mapping = new Map<string, PieceBot | undefined>([
      ["a", botClose],
      ["b", botFar],
    ]);
    makeAdapter(mapping).setSortedRenderOrder([pieceA, pieceB]);
    // farther bot → less negative (-1), closer bot → more negative (-2)
    expect(getRenderOrderFor(botFar)).toBe(-1);
    expect(getRenderOrderFor(botClose)).toBe(-2);
  });

  it("when Z and distance are equal, all bots still receive a formRenderOrder", () => {
    const pieces = [makePiece("a"), makePiece("b")];
    const bots = [makeBot("a"), makeBot("b")];
    distanceMock.mockReturnValue(0);
    const mapping = new Map<string, PieceBot | undefined>([
      ["a", bots[0]],
      ["b", bots[1]],
    ]);
    makeAdapter(mapping).setSortedRenderOrder(pieces);
    expect(setTagMaskMock).toHaveBeenCalledTimes(2);
  });

  it("calls DistanceBetweenBotAndCamera only when Z values are equal", () => {
    const pieceA = makePiece("a");
    const pieceB = makePiece("b");
    const botA = makeBot("a", { tags: 0 });
    const botB = makeBot("b", { tags: 10 }); // different Z
    const mapping = new Map<string, PieceBot | undefined>([
      ["a", botA],
      ["b", botB],
    ]);
    makeAdapter(mapping).setSortedRenderOrder([pieceA, pieceB]);
    expect(distanceMock).not.toHaveBeenCalled();
  });
});
