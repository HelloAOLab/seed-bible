import { ActivityIndicatorMapper } from "bibleVizUtils.infrastructure.mappers.ActivityIndicatorMapper";

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

const makeRegularBot = (overrides: any = {}): any => ({
  id: "bot-1",
  tags: { indicatorType: "regular", index: 0, ...overrides },
  masks: {},
});

const makeNonRegularBot = (overrides: any = {}): any => ({
  id: "bot-2",
  tags: { indicatorType: "label", index: 3, ...overrides },
  masks: {},
});

const makeIndicator = (overrides: any = {}): any => ({
  id: "bot-1",
  type: "ActivityIndicator",
  indicatorType: "regular",
  index: 0,
  ...overrides,
});

// ─── toDomain — regular type ──────────────────────────────────────────────────

describe("toDomain — regular indicatorType", () => {
  it("returns a domain object with type 'ActivityIndicator'", () => {
    expect(new ActivityIndicatorMapper().toDomain(makeRegularBot()).type).toBe(
      "ActivityIndicator"
    );
  });

  it("maps bot.id to id", () => {
    expect(
      new ActivityIndicatorMapper().toDomain(makeRegularBot({ id: "x-1" }))
    ).toMatchObject({
      id: "bot-1",
    });
  });

  it("sets indicatorType to 'regular'", () => {
    expect(
      new ActivityIndicatorMapper().toDomain(makeRegularBot()).indicatorType
    ).toBe("regular");
  });

  it("maps a numeric index of 0", () => {
    expect(
      new ActivityIndicatorMapper().toDomain(makeRegularBot({ index: 0 })).index
    ).toBe(0);
  });

  it("maps a positive numeric index", () => {
    expect(
      new ActivityIndicatorMapper().toDomain(makeRegularBot({ index: 5 })).index
    ).toBe(5);
  });

  it("throws when index is a string", () => {
    expect(() =>
      new ActivityIndicatorMapper().toDomain(makeRegularBot({ index: "1" }))
    ).toThrow("index of a regular indicator must be a number");
  });

  it("throws when index is undefined", () => {
    expect(() =>
      new ActivityIndicatorMapper().toDomain(
        makeRegularBot({ index: undefined })
      )
    ).toThrow("index of a regular indicator must be a number");
  });

  it("throws when index is null", () => {
    expect(() =>
      new ActivityIndicatorMapper().toDomain(makeRegularBot({ index: null }))
    ).toThrow("index of a regular indicator must be a number");
  });
});

// ─── toDomain — undefined indicatorType ──────────────────────────────────────

describe("toDomain — missing indicatorType", () => {
  it("throws when indicatorType is undefined", () => {
    expect(() =>
      new ActivityIndicatorMapper().toDomain(
        makeRegularBot({ indicatorType: undefined })
      )
    ).toThrow("bot.tags.indicatorType not defined at toDomain");
  });

  it("throws when indicatorType is null", () => {
    expect(() =>
      new ActivityIndicatorMapper().toDomain(
        makeRegularBot({ indicatorType: null })
      )
    ).toThrow("bot.tags.indicatorType not defined at toDomain");
  });

  it("throws when indicatorType is an empty string", () => {
    expect(() =>
      new ActivityIndicatorMapper().toDomain(
        makeRegularBot({ indicatorType: "" })
      )
    ).toThrow("bot.tags.indicatorType not defined at toDomain");
  });
});

// ─── toDomain — non-regular type ─────────────────────────────────────────────

describe("toDomain — non-regular indicatorType", () => {
  it("returns a domain object with the given indicatorType", () => {
    expect(
      new ActivityIndicatorMapper().toDomain(makeNonRegularBot()).indicatorType
    ).toBe("label");
  });

  it("maps bot.id to id", () => {
    expect(new ActivityIndicatorMapper().toDomain(makeNonRegularBot()).id).toBe(
      "bot-2"
    );
  });

  it("sets type to 'ActivityIndicator'", () => {
    expect(
      new ActivityIndicatorMapper().toDomain(makeNonRegularBot()).type
    ).toBe("ActivityIndicator");
  });

  it("maps the index", () => {
    expect(
      new ActivityIndicatorMapper().toDomain(makeNonRegularBot({ index: 7 }))
        .index
    ).toBe(7);
  });

  it("throws when index is falsy (undefined)", () => {
    expect(() =>
      new ActivityIndicatorMapper().toDomain(
        makeNonRegularBot({ index: undefined })
      )
    ).toThrow("bot.tags.index not defined at toDomain");
  });

  it("throws when index is falsy (null)", () => {
    expect(() =>
      new ActivityIndicatorMapper().toDomain(makeNonRegularBot({ index: null }))
    ).toThrow("bot.tags.index not defined at toDomain");
  });

  it("throws when index is 0 (falsy guard treats 0 as missing)", () => {
    expect(() =>
      new ActivityIndicatorMapper().toDomain(makeNonRegularBot({ index: 0 }))
    ).toThrow("bot.tags.index not defined at toDomain");
  });

  it("preserves the indicatorType string verbatim", () => {
    const bot = makeNonRegularBot({ indicatorType: "grounded" });
    expect(new ActivityIndicatorMapper().toDomain(bot).indicatorType).toBe(
      "grounded"
    );
  });
});

// ─── toInfrastructure ─────────────────────────────────────────────────────────

describe("toInfrastructure", () => {
  it("calls byID with the indicator's id", () => {
    new ActivityIndicatorMapper().toInfrastructure(makeIndicator());
    expect((globalThis as any).byID).toHaveBeenCalledWith("bot-1");
  });

  it("calls getBot with the result of byID", () => {
    const filter = { tag: "id", value: "bot-1" };
    (globalThis as any).byID.mockReturnValue(filter);
    new ActivityIndicatorMapper().toInfrastructure(makeIndicator());
    expect((globalThis as any).getBot).toHaveBeenCalledWith(filter);
  });

  it("returns the bot when getBot finds it", () => {
    const bot = makeRegularBot();
    (globalThis as any).getBot.mockReturnValue(bot);
    expect(
      new ActivityIndicatorMapper().toInfrastructure(makeIndicator())
    ).toBe(bot);
  });

  it("returns undefined when getBot returns undefined", () => {
    (globalThis as any).getBot.mockReturnValue(undefined);
    expect(
      new ActivityIndicatorMapper().toInfrastructure(makeIndicator())
    ).toBeUndefined();
  });

  it("returns undefined when getBot returns null", () => {
    (globalThis as any).getBot.mockReturnValue(null);
    expect(
      new ActivityIndicatorMapper().toInfrastructure(makeIndicator())
    ).toBeUndefined();
  });
});
