import { ActivityIndicatorBotsRepository } from "bibleVizUtils.infrastructure.adapters.pieceActivity.ActivityIndicatorBotsRepository";

// ─── globals ──────────────────────────────────────────────────────────────────

let getBotsMock: jest.Mock;
let byTagMock: jest.Mock;

beforeEach(() => {
  getBotsMock = jest.fn().mockReturnValue([]);
  byTagMock = jest
    .fn()
    .mockImplementation((tag: string, value: unknown) => ({ tag, value }));

  (globalThis as any).getBots = getBotsMock;
  (globalThis as any).byTag = byTagMock;
});

afterEach(() => {
  delete (globalThis as any).getBots;
  delete (globalThis as any).byTag;
  jest.clearAllMocks();
});

// ─── factories ────────────────────────────────────────────────────────────────

const makeRepo = () => new ActivityIndicatorBotsRepository();

const makeIndicatorBot = (id = "indicator-1"): any => ({
  id,
  tags: {
    type: "ActivityIndicator",
    isActivityIndicator: true,
    isInUse: true,
    ownerDataId: "data-1",
    ownerBotId: "piece-1",
  },
});

// ─── getIndicatorBotsByPieceDataId ────────────────────────────────────────────

describe("getIndicatorBotsByPieceDataId", () => {
  it("returns the bots from getBots", () => {
    const bot = makeIndicatorBot();
    getBotsMock.mockReturnValue([bot]);
    const result = makeRepo().getIndicatorBotsByPieceDataId("data-1");
    expect(result).toContain(bot);
  });

  it("returns an empty array when getBots finds no match", () => {
    getBotsMock.mockReturnValue([]);
    expect(makeRepo().getIndicatorBotsByPieceDataId("data-none")).toEqual([]);
  });

  it("passes a byTag filter for isActivityIndicator=true", () => {
    makeRepo().getIndicatorBotsByPieceDataId("data-1");
    expect(byTagMock).toHaveBeenCalledWith("isActivityIndicator", true);
  });

  it("passes a byTag filter for ownerDataId matching the supplied id", () => {
    makeRepo().getIndicatorBotsByPieceDataId("my-data-id");
    expect(byTagMock).toHaveBeenCalledWith("ownerDataId", "my-data-id");
  });

  it("passes a byTag filter for isInUse=true", () => {
    makeRepo().getIndicatorBotsByPieceDataId("data-1");
    expect(byTagMock).toHaveBeenCalledWith("isInUse", true);
  });

  it("calls getBots with all three byTag filters", () => {
    makeRepo().getIndicatorBotsByPieceDataId("data-1");
    expect(getBotsMock).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "isActivityIndicator" }),
      expect.objectContaining({ tag: "ownerDataId" }),
      expect.objectContaining({ tag: "isInUse" })
    );
  });

  it("calls getBots exactly once per invocation", () => {
    makeRepo().getIndicatorBotsByPieceDataId("data-1");
    expect(getBotsMock).toHaveBeenCalledTimes(1);
  });

  it("returns multiple bots when getBots returns multiple results", () => {
    const bots = [
      makeIndicatorBot("a"),
      makeIndicatorBot("b"),
      makeIndicatorBot("c"),
    ];
    getBotsMock.mockReturnValue(bots);
    expect(makeRepo().getIndicatorBotsByPieceDataId("data-1")).toHaveLength(3);
  });
});

// ─── getIndicatorBotsByPieceId ────────────────────────────────────────────────

describe("getIndicatorBotsByPieceId", () => {
  it("returns the bots from getBots", () => {
    const bot = makeIndicatorBot();
    getBotsMock.mockReturnValue([bot]);
    const result = makeRepo().getIndicatorBotsByPieceId("piece-1");
    expect(result).toContain(bot);
  });

  it("returns an empty array when getBots finds no match", () => {
    getBotsMock.mockReturnValue([]);
    expect(makeRepo().getIndicatorBotsByPieceId("piece-none")).toEqual([]);
  });

  it("passes a byTag filter for isActivityIndicator=true", () => {
    makeRepo().getIndicatorBotsByPieceId("piece-1");
    expect(byTagMock).toHaveBeenCalledWith("isActivityIndicator", true);
  });

  it("passes a byTag filter for ownerBotId matching the supplied id", () => {
    makeRepo().getIndicatorBotsByPieceId("my-piece-id");
    expect(byTagMock).toHaveBeenCalledWith("ownerBotId", "my-piece-id");
  });

  it("passes a byTag filter for isInUse=true", () => {
    makeRepo().getIndicatorBotsByPieceId("piece-1");
    expect(byTagMock).toHaveBeenCalledWith("isInUse", true);
  });

  it("calls getBots with all three byTag filters", () => {
    makeRepo().getIndicatorBotsByPieceId("piece-1");
    expect(getBotsMock).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "isActivityIndicator" }),
      expect.objectContaining({ tag: "ownerBotId" }),
      expect.objectContaining({ tag: "isInUse" })
    );
  });

  it("calls getBots exactly once per invocation", () => {
    makeRepo().getIndicatorBotsByPieceId("piece-1");
    expect(getBotsMock).toHaveBeenCalledTimes(1);
  });

  it("returns multiple bots when getBots returns multiple results", () => {
    const bots = [makeIndicatorBot("a"), makeIndicatorBot("b")];
    getBotsMock.mockReturnValue(bots);
    expect(makeRepo().getIndicatorBotsByPieceId("piece-1")).toHaveLength(2);
  });

  it("does not call getBots with an ownerDataId filter", () => {
    makeRepo().getIndicatorBotsByPieceId("piece-1");
    const hasDataIdFilter = byTagMock.mock.calls.some(
      ([tag]: [string]) => tag === "ownerDataId"
    );
    expect(hasDataIdFilter).toBe(false);
  });
});

// ─── method isolation ─────────────────────────────────────────────────────────

describe("method isolation", () => {
  it("getIndicatorBotsByPieceDataId does not call getBots with an ownerBotId filter", () => {
    makeRepo().getIndicatorBotsByPieceDataId("data-1");
    const hasBotIdFilter = byTagMock.mock.calls.some(
      ([tag]: [string]) => tag === "ownerBotId"
    );
    expect(hasBotIdFilter).toBe(false);
  });

  it("successive calls to different methods each call getBots independently", () => {
    makeRepo().getIndicatorBotsByPieceDataId("data-1");
    makeRepo().getIndicatorBotsByPieceId("piece-1");
    expect(getBotsMock).toHaveBeenCalledTimes(2);
  });
});
