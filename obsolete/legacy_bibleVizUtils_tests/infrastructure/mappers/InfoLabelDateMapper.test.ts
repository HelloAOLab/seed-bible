import { InfoLabelDateMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelDateMapper";

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
  tags: { type: "InfoLabelDate" },
  masks: {},
  ...overrides,
});

const makePiece = (overrides: any = {}): any => ({
  id: "bot-1",
  type: "InfoLabelDate" as const,
  ...overrides,
});

// ─── toDomain ────────────────────────────────────────────────────────────────

describe("toDomain", () => {
  it("maps bot.id to id", () => {
    expect(InfoLabelDateMapper.toDomain(makeBot()).id).toBe("bot-1");
  });

  it("maps a different bot.id", () => {
    expect(InfoLabelDateMapper.toDomain(makeBot({ id: "x-99" })).id).toBe(
      "x-99"
    );
  });

  it("sets type to 'InfoLabelDate'", () => {
    expect(InfoLabelDateMapper.toDomain(makeBot()).type).toBe("InfoLabelDate");
  });

  it("returns an object with exactly id and type", () => {
    const result = InfoLabelDateMapper.toDomain(makeBot({ id: "abc" }));
    expect(result).toEqual({ id: "abc", type: "InfoLabelDate" });
  });

  it("produces distinct objects for distinct bots", () => {
    const a = InfoLabelDateMapper.toDomain(makeBot({ id: "a" }));
    const b = InfoLabelDateMapper.toDomain(makeBot({ id: "b" }));
    expect(a).not.toBe(b);
    expect(a.id).toBe("a");
    expect(b.id).toBe("b");
  });

  it("does not include extra tags in the result", () => {
    const result = InfoLabelDateMapper.toDomain(
      makeBot({ ownerBotId: "owner-1", formOpacity: 0.5 })
    ) as any;
    expect(result.ownerBotId).toBeUndefined();
    expect(result.formOpacity).toBeUndefined();
  });
});

// ─── toInfrastructure ─────────────────────────────────────────────────────────

describe("toInfrastructure", () => {
  it("calls byID with the piece id", () => {
    InfoLabelDateMapper.toInfrastructure(makePiece({ id: "p-1" }));
    expect((globalThis as any).byID).toHaveBeenCalledWith("p-1");
  });

  it("calls getBot with the result of byID", () => {
    const filter = { tag: "id", value: "p-1" };
    (globalThis as any).byID.mockReturnValue(filter);
    InfoLabelDateMapper.toInfrastructure(makePiece());
    expect((globalThis as any).getBot).toHaveBeenCalledWith(filter);
  });

  it("returns the bot when getBot finds it", () => {
    const bot = makeBot();
    (globalThis as any).getBot.mockReturnValue(bot);
    expect(InfoLabelDateMapper.toInfrastructure(makePiece())).toBe(bot);
  });

  it("returns undefined when getBot returns undefined", () => {
    (globalThis as any).getBot.mockReturnValue(undefined);
    expect(InfoLabelDateMapper.toInfrastructure(makePiece())).toBeUndefined();
  });

  it("returns undefined when getBot returns null", () => {
    (globalThis as any).getBot.mockReturnValue(null);
    expect(InfoLabelDateMapper.toInfrastructure(makePiece())).toBeUndefined();
  });

  it("calls byID and getBot exactly once per invocation", () => {
    InfoLabelDateMapper.toInfrastructure(makePiece());
    expect((globalThis as any).byID).toHaveBeenCalledTimes(1);
    expect((globalThis as any).getBot).toHaveBeenCalledTimes(1);
  });
});
