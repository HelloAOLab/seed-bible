import { PieceMapper } from "bibleVizUtils.infrastructure.mappers.PieceMapper";

// ─── globals ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  (globalThis as any).getBot = jest.fn().mockReturnValue(undefined);
  (globalThis as any).byID = jest.fn().mockReturnValue(null);
});

afterEach(() => {
  delete (globalThis as any).getBot;
  delete (globalThis as any).byID;
});

// ─── factories ────────────────────────────────────────────────────────────────

const makeBot = (overrides: any = {}): any => ({
  id: "bot-1",
  tags: { type: "SomeType" },
  masks: {},
  ...overrides,
});

const makePiece = (overrides: any = {}): any => ({
  id: "bot-1",
  type: "SomeType",
  ...overrides,
});

// ─── toDomain ────────────────────────────────────────────────────────────────

describe("toDomain", () => {
  it("maps bot.id to id", () => {
    expect(PieceMapper.toDomain(makeBot()).id).toBe("bot-1");
  });

  it("maps a different bot.id", () => {
    expect(PieceMapper.toDomain(makeBot({ id: "x-42" })).id).toBe("x-42");
  });

  it("maps bot.tags.type to type", () => {
    expect(PieceMapper.toDomain(makeBot()).type).toBe("SomeType");
  });

  it("maps a different bot.tags.type", () => {
    const bot = makeBot({ tags: { type: "InfoLabelText" } });
    expect(PieceMapper.toDomain(bot).type).toBe("InfoLabelText");
  });

  it("returns an object with exactly id and type", () => {
    const result = PieceMapper.toDomain(makeBot({ id: "abc" }));
    expect(result).toEqual({ id: "abc", type: "SomeType" });
  });

  it("produces distinct objects for distinct bots", () => {
    const a = PieceMapper.toDomain(makeBot({ id: "a" }));
    const b = PieceMapper.toDomain(makeBot({ id: "b" }));
    expect(a).not.toBe(b);
    expect(a.id).toBe("a");
    expect(b.id).toBe("b");
  });

  it("does not include extra bot fields in the result", () => {
    const result = PieceMapper.toDomain(makeBot()) as any;
    expect(result.tags).toBeUndefined();
    expect(result.masks).toBeUndefined();
  });
});

// ─── toInfrastructure ─────────────────────────────────────────────────────────

describe("toInfrastructure", () => {
  it("calls byID with the piece id", () => {
    PieceMapper.toInfrastructure(makePiece({ id: "p-1" }));
    expect((globalThis as any).byID).toHaveBeenCalledWith("p-1");
  });

  it("calls getBot with the result of byID", () => {
    const filter = { tag: "id", value: "p-1" };
    (globalThis as any).byID.mockReturnValue(filter);
    PieceMapper.toInfrastructure(makePiece());
    expect((globalThis as any).getBot).toHaveBeenCalledWith(filter);
  });

  it("returns the bot when getBot finds it", () => {
    const bot = makeBot();
    (globalThis as any).getBot.mockReturnValue(bot);
    expect(PieceMapper.toInfrastructure(makePiece())).toBe(bot);
  });

  it("returns undefined when getBot returns undefined", () => {
    (globalThis as any).getBot.mockReturnValue(undefined);
    expect(PieceMapper.toInfrastructure(makePiece())).toBeUndefined();
  });

  it("returns undefined when getBot returns null", () => {
    (globalThis as any).getBot.mockReturnValue(null);
    expect(PieceMapper.toInfrastructure(makePiece())).toBeUndefined();
  });

  it("calls byID and getBot exactly once per invocation", () => {
    PieceMapper.toInfrastructure(makePiece());
    expect((globalThis as any).byID).toHaveBeenCalledTimes(1);
    expect((globalThis as any).getBot).toHaveBeenCalledTimes(1);
  });
});
