import { ActivityNotificationMapper } from "bibleVizUtils.infrastructure.mappers.ActivityNotificationMapper";

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
  tags: {},
  masks: {},
  ...overrides,
});

const makeNotification = (overrides: any = {}): any => ({
  id: "bot-1",
  type: "ActivityNotification",
  ...overrides,
});

// ─── toDomain ────────────────────────────────────────────────────────────────

describe("toDomain", () => {
  it("sets type to 'ActivityNotification'", () => {
    expect(ActivityNotificationMapper.toDomain(makeBot()).type).toBe(
      "ActivityNotification"
    );
  });

  it("maps bot.id to id", () => {
    expect(
      ActivityNotificationMapper.toDomain(makeBot({ id: "x-42" })).id
    ).toBe("x-42");
  });

  it("returns an object with exactly the id and type fields", () => {
    const result = ActivityNotificationMapper.toDomain(makeBot({ id: "abc" }));
    expect(result).toEqual({ id: "abc", type: "ActivityNotification" });
  });

  it("produces distinct objects for distinct bots", () => {
    const a = ActivityNotificationMapper.toDomain(makeBot({ id: "a" }));
    const b = ActivityNotificationMapper.toDomain(makeBot({ id: "b" }));
    expect(a).not.toBe(b);
    expect(a.id).toBe("a");
    expect(b.id).toBe("b");
  });

  it("does not include tags from the bot in the result", () => {
    const result = ActivityNotificationMapper.toDomain(
      makeBot({ tags: { indicatorType: "regular", index: 0 } })
    ) as any;
    expect(result.tags).toBeUndefined();
    expect(result.indicatorType).toBeUndefined();
  });
});

// ─── toInfrastructure ─────────────────────────────────────────────────────────

describe("toInfrastructure", () => {
  it("calls byID with the notification's id", () => {
    ActivityNotificationMapper.toInfrastructure(
      makeNotification({ id: "n-1" })
    );
    expect((globalThis as any).byID).toHaveBeenCalledWith("n-1");
  });

  it("calls getBot with the result of byID", () => {
    const filter = { tag: "id", value: "n-1" };
    (globalThis as any).byID.mockReturnValue(filter);
    ActivityNotificationMapper.toInfrastructure(makeNotification());
    expect((globalThis as any).getBot).toHaveBeenCalledWith(filter);
  });

  it("returns the bot when getBot finds it", () => {
    const bot = makeBot();
    (globalThis as any).getBot.mockReturnValue(bot);
    expect(
      ActivityNotificationMapper.toInfrastructure(makeNotification())
    ).toBe(bot);
  });

  it("returns undefined when getBot returns undefined", () => {
    (globalThis as any).getBot.mockReturnValue(undefined);
    expect(
      ActivityNotificationMapper.toInfrastructure(makeNotification())
    ).toBeUndefined();
  });

  it("returns undefined when getBot returns null", () => {
    (globalThis as any).getBot.mockReturnValue(null);
    expect(
      ActivityNotificationMapper.toInfrastructure(makeNotification())
    ).toBeUndefined();
  });

  it("calls byID and getBot exactly once per invocation", () => {
    ActivityNotificationMapper.toInfrastructure(makeNotification());
    expect((globalThis as any).byID).toHaveBeenCalledTimes(1);
    expect((globalThis as any).getBot).toHaveBeenCalledTimes(1);
  });
});
