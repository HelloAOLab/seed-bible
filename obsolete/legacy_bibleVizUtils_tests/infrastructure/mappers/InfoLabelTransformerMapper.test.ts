import { InfoLabelTransformerMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTransformerMapper";

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
  tags: { type: "InfoLabelTransformer" },
  masks: {},
  ...overrides,
});

const makePiece = (overrides: any = {}): any => ({
  id: "bot-1",
  type: "InfoLabelTransformer" as const,
  ...overrides,
});

// ─── toDomain ────────────────────────────────────────────────────────────────

describe("toDomain", () => {
  it("maps bot.id to id", () => {
    expect(InfoLabelTransformerMapper.toDomain(makeBot()).id).toBe("bot-1");
  });

  it("maps a different bot.id", () => {
    expect(
      InfoLabelTransformerMapper.toDomain(makeBot({ id: "x-99" })).id
    ).toBe("x-99");
  });

  it("sets type to 'InfoLabelTransformer'", () => {
    expect(InfoLabelTransformerMapper.toDomain(makeBot()).type).toBe(
      "InfoLabelTransformer"
    );
  });

  it("returns an object with exactly id and type", () => {
    const result = InfoLabelTransformerMapper.toDomain(makeBot({ id: "abc" }));
    expect(result).toEqual({ id: "abc", type: "InfoLabelTransformer" });
  });

  it("produces distinct objects for distinct bots", () => {
    const a = InfoLabelTransformerMapper.toDomain(makeBot({ id: "a" }));
    const b = InfoLabelTransformerMapper.toDomain(makeBot({ id: "b" }));
    expect(a).not.toBe(b);
    expect(a.id).toBe("a");
    expect(b.id).toBe("b");
  });

  it("does not include extra tags in the result", () => {
    const result = InfoLabelTransformerMapper.toDomain(makeBot()) as any;
    expect(result.tags).toBeUndefined();
    expect(result.masks).toBeUndefined();
  });
});

// ─── toInfrastructure ─────────────────────────────────────────────────────────

describe("toInfrastructure", () => {
  it("calls byID with the piece id", () => {
    InfoLabelTransformerMapper.toInfrastructure(makePiece({ id: "p-1" }));
    expect((globalThis as any).byID).toHaveBeenCalledWith("p-1");
  });

  it("calls getBot with the result of byID", () => {
    const filter = { tag: "id", value: "p-1" };
    (globalThis as any).byID.mockReturnValue(filter);
    InfoLabelTransformerMapper.toInfrastructure(makePiece());
    expect((globalThis as any).getBot).toHaveBeenCalledWith(filter);
  });

  it("returns the bot when getBot finds it", () => {
    const bot = makeBot();
    (globalThis as any).getBot.mockReturnValue(bot);
    expect(InfoLabelTransformerMapper.toInfrastructure(makePiece())).toBe(bot);
  });

  it("returns undefined when getBot returns undefined", () => {
    (globalThis as any).getBot.mockReturnValue(undefined);
    expect(
      InfoLabelTransformerMapper.toInfrastructure(makePiece())
    ).toBeUndefined();
  });

  it("returns undefined when getBot returns null", () => {
    (globalThis as any).getBot.mockReturnValue(null);
    expect(
      InfoLabelTransformerMapper.toInfrastructure(makePiece())
    ).toBeUndefined();
  });

  it("calls byID and getBot exactly once per invocation", () => {
    InfoLabelTransformerMapper.toInfrastructure(makePiece());
    expect((globalThis as any).byID).toHaveBeenCalledTimes(1);
    expect((globalThis as any).getBot).toHaveBeenCalledTimes(1);
  });
});
