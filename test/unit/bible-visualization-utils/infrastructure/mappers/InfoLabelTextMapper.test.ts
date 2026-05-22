import { InfoLabelTextMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTextMapper";

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
  tags: { type: "InfoLabelText" },
  masks: {},
  ...overrides,
});

const makePiece = (overrides: any = {}): any => ({
  id: "bot-1",
  type: "InfoLabelText" as const,
  ...overrides,
});

// ─── toDomain ────────────────────────────────────────────────────────────────

describe("toDomain", () => {
  it("maps bot.id to id", () => {
    expect(InfoLabelTextMapper.toDomain(makeBot()).id).toBe("bot-1");
  });

  it("maps a different bot.id", () => {
    expect(InfoLabelTextMapper.toDomain(makeBot({ id: "x-99" })).id).toBe(
      "x-99"
    );
  });

  it("sets type to 'InfoLabelText'", () => {
    expect(InfoLabelTextMapper.toDomain(makeBot()).type).toBe("InfoLabelText");
  });

  it("returns an object with exactly id and type", () => {
    const result = InfoLabelTextMapper.toDomain(makeBot({ id: "abc" }));
    expect(result).toEqual({ id: "abc", type: "InfoLabelText" });
  });

  it("produces distinct objects for distinct bots", () => {
    const a = InfoLabelTextMapper.toDomain(makeBot({ id: "a" }));
    const b = InfoLabelTextMapper.toDomain(makeBot({ id: "b" }));
    expect(a).not.toBe(b);
    expect(a.id).toBe("a");
    expect(b.id).toBe("b");
  });

  it("does not include extra tags in the result", () => {
    const result = InfoLabelTextMapper.toDomain(makeBot()) as any;
    expect(result.tags).toBeUndefined();
    expect(result.masks).toBeUndefined();
  });
});

// ─── toInfrastructure ─────────────────────────────────────────────────────────

describe("toInfrastructure", () => {
  it("calls byID with the piece id", () => {
    InfoLabelTextMapper.toInfrastructure(makePiece({ id: "p-1" }));
    expect((globalThis as any).byID).toHaveBeenCalledWith("p-1");
  });

  it("calls getBot with the result of byID", () => {
    const filter = { tag: "id", value: "p-1" };
    (globalThis as any).byID.mockReturnValue(filter);
    InfoLabelTextMapper.toInfrastructure(makePiece());
    expect((globalThis as any).getBot).toHaveBeenCalledWith(filter);
  });

  it("returns the bot when getBot finds it", () => {
    const bot = makeBot();
    (globalThis as any).getBot.mockReturnValue(bot);
    expect(InfoLabelTextMapper.toInfrastructure(makePiece())).toBe(bot);
  });

  it("returns undefined when getBot returns undefined", () => {
    (globalThis as any).getBot.mockReturnValue(undefined);
    expect(InfoLabelTextMapper.toInfrastructure(makePiece())).toBeUndefined();
  });

  it("returns undefined when getBot returns null", () => {
    (globalThis as any).getBot.mockReturnValue(null);
    expect(InfoLabelTextMapper.toInfrastructure(makePiece())).toBeUndefined();
  });

  it("calls byID and getBot exactly once per invocation", () => {
    InfoLabelTextMapper.toInfrastructure(makePiece());
    expect((globalThis as any).byID).toHaveBeenCalledTimes(1);
    expect((globalThis as any).getBot).toHaveBeenCalledTimes(1);
  });
});
