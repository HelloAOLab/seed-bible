import {
  DistanceBetweenBotAndCamera,
  computeAnimateTag,
  applySetTag,
  GetBotScales,
  GetTransformedScales,
  GetTransformedPosition,
  MakePortalFree,
  MakePortalRestrict,
  SetStrictTag,
  ApplyStrictMod,
} from "bibleVizUtils.infrastructure.functions.casualos";

// ─── globals ──────────────────────────────────────────────────────────────────

class Vec3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0
  ) {}
  static distanceBetween = jest.fn().mockReturnValue(0);
}

beforeEach(() => {
  jest.clearAllMocks();
  Vec3.distanceBetween.mockReturnValue(0);

  (globalThis as any).Vector3 = Vec3;
  (globalThis as any).os = {
    getCameraPosition: jest.fn().mockReturnValue(new Vec3(0, 0, 0)),
    getCurrentDimension: jest.fn().mockReturnValue("grid"),
  };
  (globalThis as any).animateTag = jest.fn().mockReturnValue(Promise.resolve());
  (globalThis as any).setTag = jest.fn();
  (globalThis as any).setTagMask = jest.fn();
  (globalThis as any).applyMod = jest.fn();
  (globalThis as any).getBot = jest.fn().mockReturnValue(undefined);
  (globalThis as any).byID = jest.fn().mockReturnValue(null);
  (globalThis as any).getBotPosition = jest
    .fn()
    .mockReturnValue(new Vec3(0, 0, 0));
  (globalThis as any).gridPortalBot = { id: "portal-bot" };
});

afterEach(() => {
  for (const key of [
    "Vector3",
    "os",
    "animateTag",
    "setTag",
    "setTagMask",
    "applyMod",
    "getBot",
    "byID",
    "getBotPosition",
    "gridPortalBot",
  ]) {
    delete (globalThis as any)[key];
  }
});

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeBot = (tags: any = {}, masks: any = {}): any => ({ tags, masks });

// ─── DistanceBetweenBotAndCamera ──────────────────────────────────────────────

describe("DistanceBetweenBotAndCamera", () => {
  it("calls os.getCurrentDimension to determine the dimension", () => {
    DistanceBetweenBotAndCamera({
      bot: makeBot({ gridX: 1, gridY: 2, gridZ: 3 }),
    });
    expect((globalThis as any).os.getCurrentDimension).toHaveBeenCalled();
  });

  it("calls os.getCameraPosition with 'grid'", () => {
    DistanceBetweenBotAndCamera({
      bot: makeBot({ gridX: 1, gridY: 2, gridZ: 3 }),
    });
    expect((globalThis as any).os.getCameraPosition).toHaveBeenCalledWith(
      "grid"
    );
  });

  it("constructs a Vector3 from the bot's position tags", () => {
    const bot = makeBot({ gridX: 1, gridY: 2, gridZ: 3 });
    DistanceBetweenBotAndCamera({ bot });
    expect(Vec3.distanceBetween).toHaveBeenCalled();
    const [botPos] = Vec3.distanceBetween.mock.calls[0];
    expect(botPos.x).toBe(1);
    expect(botPos.y).toBe(2);
    expect(botPos.z).toBe(3);
  });

  it("prefers mask values over tag values for the bot position", () => {
    const bot = makeBot(
      { gridX: 1, gridY: 2, gridZ: 3 },
      { gridX: 10, gridY: 20, gridZ: 30 }
    );
    DistanceBetweenBotAndCamera({ bot });
    const [botPos] = Vec3.distanceBetween.mock.calls[0];
    expect(botPos.x).toBe(10);
    expect(botPos.y).toBe(20);
    expect(botPos.z).toBe(30);
  });

  it("calls Vector3.distanceBetween with the bot position and camera position", () => {
    const cameraPos = new Vec3(5, 6, 7);
    (globalThis as any).os.getCameraPosition.mockReturnValue(cameraPos);
    const bot = makeBot({ gridX: 1, gridY: 2, gridZ: 3 });
    DistanceBetweenBotAndCamera({ bot });
    const [, cam] = Vec3.distanceBetween.mock.calls[0];
    expect(cam).toBe(cameraPos);
  });

  it("returns the value from Vector3.distanceBetween", () => {
    Vec3.distanceBetween.mockReturnValue(42);
    const result = DistanceBetweenBotAndCamera({
      bot: makeBot({ gridX: 0, gridY: 0, gridZ: 0 }),
    });
    expect(result).toBe(42);
  });
});

// ─── computeAnimateTag ────────────────────────────────────────────────────────

describe("computeAnimateTag", () => {
  it("calls animateTag with bot and options when tag is provided", async () => {
    const bot = makeBot();
    const options = { fromValue: 0, toValue: 1, duration: 0.5 };
    (globalThis as any).animateTag.mockReturnValue(Promise.resolve());
    await computeAnimateTag({ bot, tag: "opacity", options });
    expect((globalThis as any).animateTag).toHaveBeenCalledWith(
      bot,
      "opacity",
      options
    );
  });

  it("calls animateTag with bot and options (no separate tag) when tag is falsy", async () => {
    const bot = makeBot();
    const options = { fromValue: 0, toValue: 1, duration: 0.5 };
    (globalThis as any).animateTag.mockReturnValue(Promise.resolve());
    await computeAnimateTag({ bot, tag: undefined, options });
    expect((globalThis as any).animateTag).toHaveBeenCalledWith(bot, options);
  });

  it("returns a Promise", () => {
    (globalThis as any).animateTag.mockReturnValue(Promise.resolve());
    const result = computeAnimateTag({
      bot: makeBot(),
      tag: "opacity",
      options: {} as any,
    });
    expect(result).toBeInstanceOf(Promise);
  });

  it("recursively calls computeAnimateTag for the 'then' chain", async () => {
    const bot = makeBot();
    (globalThis as any).animateTag.mockReturnValue(Promise.resolve());
    await computeAnimateTag({
      bot,
      tag: "opacity",
      options: {} as any,
      then: { bot, tag: "scaleX", options: {} as any },
    });
    expect((globalThis as any).animateTag).toHaveBeenCalledTimes(2);
    expect((globalThis as any).animateTag).toHaveBeenNthCalledWith(
      2,
      bot,
      "scaleX",
      {}
    );
  });

  it("resolves without error when there is no 'then'", async () => {
    (globalThis as any).animateTag.mockReturnValue(Promise.resolve());
    await expect(
      computeAnimateTag({ bot: makeBot(), tag: "opacity", options: {} as any })
    ).resolves.toBeUndefined();
  });
});

// ─── applySetTag ──────────────────────────────────────────────────────────────

describe("applySetTag", () => {
  it("calls setTag with bot, tag, and options.toValue", () => {
    const bot = makeBot();
    applySetTag({ bot, tag: "opacity", options: { toValue: 0.5 } as any });
    expect((globalThis as any).setTag).toHaveBeenCalledWith(
      bot,
      "opacity",
      0.5
    );
  });

  it("calls setTag exactly once when there is no 'then'", () => {
    applySetTag({
      bot: makeBot(),
      tag: "opacity",
      options: { toValue: 1 } as any,
    });
    expect((globalThis as any).setTag).toHaveBeenCalledTimes(1);
  });

  it("recursively calls applySetTag for the 'then' chain", () => {
    const bot = makeBot();
    applySetTag({
      bot,
      tag: "opacity",
      options: { toValue: 0 } as any,
      then: { bot, tag: "scaleX", options: { toValue: 2 } as any },
    });
    expect((globalThis as any).setTag).toHaveBeenCalledTimes(2);
    expect((globalThis as any).setTag).toHaveBeenNthCalledWith(
      2,
      bot,
      "scaleX",
      2
    );
  });
});

// ─── GetBotScales ─────────────────────────────────────────────────────────────

describe("GetBotScales", () => {
  it("returns tag scaleX/Y/Z when masks are absent", () => {
    const bot = makeBot({ scaleX: 2, scaleY: 3, scaleZ: 4 });
    expect(GetBotScales(bot)).toEqual({ x: 2, y: 3, z: 4 });
  });

  it("prefers mask values over tag values", () => {
    const bot = makeBot(
      { scaleX: 1, scaleY: 1, scaleZ: 1 },
      { scaleX: 5, scaleY: 6, scaleZ: 7 }
    );
    expect(GetBotScales(bot)).toEqual({ x: 5, y: 6, z: 7 });
  });

  it("defaults to 1 when neither mask nor tag is set for each axis", () => {
    const bot = makeBot({}, {});
    expect(GetBotScales(bot)).toEqual({ x: 1, y: 1, z: 1 });
  });

  it("mixes mask and tag values per axis independently", () => {
    const bot = makeBot({ scaleX: 2, scaleZ: 4 }, { scaleY: 6 });
    const scales = GetBotScales(bot);
    expect(scales.x).toBe(2);
    expect(scales.y).toBe(6);
    expect(scales.z).toBe(4);
  });

  it("returns 1 for an axis with explicit tag value of undefined", () => {
    const bot = makeBot({ scaleX: undefined }, {});
    expect(GetBotScales(bot).x).toBe(1);
  });
});

// ─── GetTransformedScales ─────────────────────────────────────────────────────

describe("GetTransformedScales", () => {
  it("returns the bot's own scales when there is no transformer", () => {
    const bot = makeBot({ scaleX: 2, scaleY: 3, scaleZ: 4 });
    expect(GetTransformedScales(bot)).toEqual({ x: 2, y: 3, z: 4 });
  });

  it("multiplies bot scale by the uniform scale tag", () => {
    const bot = makeBot({ scaleX: 2, scaleY: 2, scaleZ: 2, scale: 3 });
    const scales = GetTransformedScales(bot);
    expect(scales.x).toBe(6);
    expect(scales.y).toBe(6);
    expect(scales.z).toBe(6);
  });

  it("does not call getBot when bot has no transformer", () => {
    GetTransformedScales(makeBot({ scaleX: 1, scaleY: 1, scaleZ: 1 }));
    expect((globalThis as any).getBot).not.toHaveBeenCalled();
  });

  it("looks up the transformer bot when transformer id is set in tags", () => {
    const bot = makeBot({
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      transformer: "t-1",
    });
    GetTransformedScales(bot);
    expect((globalThis as any).byID).toHaveBeenCalledWith("t-1");
    expect((globalThis as any).getBot).toHaveBeenCalled();
  });

  it("multiplies the bot scales by the transformer scales when transformer is found", () => {
    const transformer = makeBot({ scaleX: 2, scaleY: 3, scaleZ: 4 });
    (globalThis as any).getBot.mockReturnValue(transformer);
    const bot = makeBot({
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      transformer: "t-1",
    });
    const scales = GetTransformedScales(bot);
    expect(scales.x).toBe(2);
    expect(scales.y).toBe(3);
    expect(scales.z).toBe(4);
  });

  it("applies transformer uniform scale together with its axis scales", () => {
    const transformer = makeBot({ scaleX: 2, scaleY: 2, scaleZ: 2, scale: 2 });
    (globalThis as any).getBot.mockReturnValue(transformer);
    const bot = makeBot({
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      transformer: "t-1",
    });
    const scales = GetTransformedScales(bot);
    expect(scales.x).toBe(4);
    expect(scales.y).toBe(4);
    expect(scales.z).toBe(4);
  });

  it("skips transformer multiplication when getBot returns undefined", () => {
    (globalThis as any).getBot.mockReturnValue(undefined);
    const bot = makeBot({
      scaleX: 3,
      scaleY: 3,
      scaleZ: 3,
      transformer: "t-1",
    });
    expect(GetTransformedScales(bot)).toEqual({ x: 3, y: 3, z: 3 });
  });

  it("prefers transformer id from masks over tags", () => {
    const transformer = makeBot({ scaleX: 2, scaleY: 2, scaleZ: 2 });
    (globalThis as any).getBot.mockReturnValue(transformer);
    const bot = makeBot(
      { scaleX: 1, scaleY: 1, scaleZ: 1, transformer: "tag-id" },
      { transformer: "mask-id" }
    );
    GetTransformedScales(bot);
    expect((globalThis as any).byID).toHaveBeenCalledWith("mask-id");
  });
});

// ─── GetTransformedPosition ───────────────────────────────────────────────────

describe("GetTransformedPosition", () => {
  it("calls getBotPosition with the bot and dimension", () => {
    GetTransformedPosition(makeBot(), "grid");
    expect((globalThis as any).getBotPosition).toHaveBeenCalledWith(
      expect.anything(),
      "grid"
    );
  });

  it("returns the raw position when there is no transformer", () => {
    const pos = new Vec3(1, 2, 3);
    (globalThis as any).getBotPosition.mockReturnValue(pos);
    const result = GetTransformedPosition(makeBot(), "grid");
    expect(result).toBe(pos);
    expect(result.x).toBe(1);
    expect(result.y).toBe(2);
    expect(result.z).toBe(3);
  });

  it("does not call getBot when bot has no transformer", () => {
    GetTransformedPosition(makeBot(), "grid");
    expect((globalThis as any).getBot).not.toHaveBeenCalled();
  });

  it("offsets position by the transformer scales when transformer is found", () => {
    const transformer = makeBot({ scaleX: 5, scaleY: 6, scaleZ: 7 });
    (globalThis as any).getBot.mockReturnValue(transformer);
    (globalThis as any).getBotPosition.mockReturnValue(new Vec3(1, 2, 3));
    const bot = makeBot({ transformer: "t-1" });
    const result = GetTransformedPosition(bot, "grid");
    expect(result.x).toBe(6);
    expect(result.y).toBe(8);
    expect(result.z).toBe(10);
  });

  it("skips transformer offset when getBot returns undefined", () => {
    (globalThis as any).getBot.mockReturnValue(undefined);
    (globalThis as any).getBotPosition.mockReturnValue(new Vec3(1, 2, 3));
    const bot = makeBot({ transformer: "t-1" });
    const result = GetTransformedPosition(bot, "grid");
    expect(result.x).toBe(1);
    expect(result.y).toBe(2);
    expect(result.z).toBe(3);
  });
});

// ─── MakePortalFree ───────────────────────────────────────────────────────────

describe("MakePortalFree", () => {
  it("sets portalPannable to true on gridPortalBot", () => {
    MakePortalFree();
    expect((globalThis as any).setTagMask).toHaveBeenCalledWith(
      (globalThis as any).gridPortalBot,
      "portalPannable",
      true
    );
  });

  it("sets portalZoomable to true on gridPortalBot", () => {
    MakePortalFree();
    expect((globalThis as any).setTagMask).toHaveBeenCalledWith(
      (globalThis as any).gridPortalBot,
      "portalZoomable",
      true
    );
  });

  it("sets portalRotatable to true on gridPortalBot", () => {
    MakePortalFree();
    expect((globalThis as any).setTagMask).toHaveBeenCalledWith(
      (globalThis as any).gridPortalBot,
      "portalRotatable",
      true
    );
  });

  it("calls setTagMask exactly 3 times", () => {
    MakePortalFree();
    expect((globalThis as any).setTagMask).toHaveBeenCalledTimes(3);
  });
});

// ─── MakePortalRestrict ───────────────────────────────────────────────────────

describe("MakePortalRestrict", () => {
  it("sets portalPannable to false on gridPortalBot", () => {
    MakePortalRestrict();
    expect((globalThis as any).setTagMask).toHaveBeenCalledWith(
      (globalThis as any).gridPortalBot,
      "portalPannable",
      false
    );
  });

  it("sets portalZoomable to false on gridPortalBot", () => {
    MakePortalRestrict();
    expect((globalThis as any).setTagMask).toHaveBeenCalledWith(
      (globalThis as any).gridPortalBot,
      "portalZoomable",
      false
    );
  });

  it("sets portalRotatable to false on gridPortalBot", () => {
    MakePortalRestrict();
    expect((globalThis as any).setTagMask).toHaveBeenCalledWith(
      (globalThis as any).gridPortalBot,
      "portalRotatable",
      false
    );
  });

  it("calls setTagMask exactly 3 times", () => {
    MakePortalRestrict();
    expect((globalThis as any).setTagMask).toHaveBeenCalledTimes(3);
  });
});

// ─── SetStrictTag ─────────────────────────────────────────────────────────────

describe("SetStrictTag", () => {
  it("calls setTag with the bot, tag, and value", () => {
    const bot = makeBot();
    SetStrictTag(bot, "opacity", 0.5);
    expect((globalThis as any).setTag).toHaveBeenCalledWith(
      bot,
      "opacity",
      0.5
    );
  });

  it("calls setTag exactly once", () => {
    SetStrictTag(makeBot(), "scaleX", 2);
    expect((globalThis as any).setTag).toHaveBeenCalledTimes(1);
  });

  it("passes the value unchanged", () => {
    const bot = makeBot();
    SetStrictTag(bot, "color", "#ff0000");
    expect((globalThis as any).setTag).toHaveBeenCalledWith(
      bot,
      "color",
      "#ff0000"
    );
  });
});

// ─── ApplyStrictMod ──────────────────────────────────────────────────────────

describe("ApplyStrictMod", () => {
  it("calls applyMod when bot is defined", () => {
    const bot = makeBot();
    const mod = { scaleX: 2 };
    ApplyStrictMod(bot, mod);
    expect((globalThis as any).applyMod).toHaveBeenCalledWith(bot, mod);
  });

  it("calls applyMod exactly once when bot is defined", () => {
    ApplyStrictMod(makeBot(), { scaleX: 1 });
    expect((globalThis as any).applyMod).toHaveBeenCalledTimes(1);
  });

  it("does not call applyMod when bot is undefined", () => {
    ApplyStrictMod(undefined, { scaleX: 1 });
    expect((globalThis as any).applyMod).not.toHaveBeenCalled();
  });

  it("passes the mod object unchanged to applyMod", () => {
    const bot = makeBot();
    const mod = { color: "#abc", scaleX: 3 };
    ApplyStrictMod(bot, mod);
    expect((globalThis as any).applyMod).toHaveBeenCalledWith(bot, mod);
  });
});
