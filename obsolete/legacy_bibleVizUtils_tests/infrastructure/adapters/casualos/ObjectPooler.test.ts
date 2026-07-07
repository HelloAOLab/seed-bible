import {
  ObjectPooler,
  type ObjectPoolerConfig,
  type DimensionGetter,
} from "bibleVizUtils.infrastructure.adapters.casualos.ObjectPooler";
import type {
  PoolData,
  TypedBot,
} from "bibleVizUtils.infrastructure.models.casualos";

// ─── helpers ──────────────────────────────────────────────────────────────────

type TestBot = TypedBot<any>;

type TestMap = { BookBot: TestBot; ChapterBot: TestBot };

let createMock: jest.Mock;
let destroyMock: jest.Mock;
let clearTagMasksMock: jest.Mock;
let clearAnimationsMock: jest.Mock;
let botIdCounter = 0;

beforeEach(() => {
  botIdCounter = 0;
  createMock = jest.fn().mockImplementation(() => ({
    id: `bot-${++botIdCounter}`,
    link: "",
    tags: {},
    masks: {},
    links: {},
    vars: {},
    raw: {},
    changes: {},
    maskChanges: {},
  }));
  destroyMock = jest.fn();
  clearTagMasksMock = jest.fn();
  clearAnimationsMock = jest.fn();

  (globalThis as any).create = createMock;
  (globalThis as any).destroy = destroyMock;
  (globalThis as any).clearTagMasks = clearTagMasksMock;
  (globalThis as any).clearAnimations = clearAnimationsMock;
});

afterEach(() => {
  delete (globalThis as any).create;
  delete (globalThis as any).destroy;
  delete (globalThis as any).clearTagMasks;
  delete (globalThis as any).clearAnimations;
});

// ─── factories ────────────────────────────────────────────────────────────────

const makePrefab = (): TestBot => ({
  id: "prefab-id",
  link: "",
  tags: {},
  masks: {},
  links: {},
  vars: {},
  raw: {},
  changes: {},
  maskChanges: {},
});

const makePoolData = (
  key: keyof TestMap,
  size = 2,
  options: {
    customTags?: PoolData["customTags"];
    cleanupCustomTags?: PoolData["cleanupCustomTags"];
  } = {}
): PoolData<keyof TestMap, TestBot> =>
  ({
    key,
    prefab: makePrefab(),
    customTags: options.customTags ?? [],
    cleanupCustomTags: options.cleanupCustomTags,
    size,
  }) as any;

const makeDimensionGetter = (dimension = "myDimension"): DimensionGetter => ({
  getDimension: jest.fn().mockReturnValue(dimension),
});

const makePooler = (
  config: ObjectPoolerConfig<any>,
  dimensionGetter = makeDimensionGetter()
) => new ObjectPooler<any>(config, dimensionGetter);

// ─── constructor ──────────────────────────────────────────────────────────────

describe("constructor", () => {
  it("calls create once per object per pool (size=2 → 2 create calls)", () => {
    makePooler([makePoolData("BookBot", 2)]);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("calls create with the pool's prefab and tempLocal space", () => {
    const prefab = makePrefab();
    makePooler([{ key: "BookBot", prefab, customTags: [], size: 1 } as any]);
    expect(createMock).toHaveBeenCalledWith(prefab, { space: "tempLocal" });
  });

  it("sets the type tag on each created object equal to the pool key", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    const obj = pooler.getObject("BookBot");
    expect(obj.tags["type"]).toBe("BookBot");
  });

  it("sets customTags on each created object", () => {
    const poolData = makePoolData("BookBot", 1, {
      customTags: [{ tag: "color", value: "#ff0000" }] as any,
    });
    const pooler = makePooler([poolData]);
    const obj = pooler.getObject("BookBot");
    expect(obj.tags["color"]).toBe("#ff0000");
  });

  it("creates objects for every pool in the config", () => {
    makePooler([makePoolData("BookBot", 1), makePoolData("ChapterBot", 2)]);
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it("creates zero objects when pool size is 0", () => {
    makePooler([makePoolData("BookBot", 0)]);
    expect(createMock).not.toHaveBeenCalled();
  });
});

// ─── getObject ────────────────────────────────────────────────────────────────

describe("getObject", () => {
  it("returns an object from the pool", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    const obj = pooler.getObject("BookBot");
    expect(obj).toBeDefined();
    expect(obj.id).toBeTruthy();
  });

  it("sets isInUse=true on the returned object", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    const obj = pooler.getObject("BookBot");
    expect(obj.tags.isInUse).toBe(true);
  });

  it("shifts from the pool — successive calls return different objects", () => {
    const pooler = makePooler([makePoolData("BookBot", 2)]);
    const a = pooler.getObject("BookBot");
    const b = pooler.getObject("BookBot");
    expect(a.id).not.toBe(b.id);
  });

  it("throws when the key is not registered", () => {
    const pooler = makePooler([]);
    expect(() => pooler.getObject("BookBot")).toThrow(
      "ObjectPooler: pool not registered for key BookBot"
    );
  });

  it("creates a new object when the pool is exhausted", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    createMock.mockClear();
    pooler.getObject("BookBot"); // drains the pool
    pooler.getObject("BookBot"); // pool empty → creates new
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("new object created on exhaustion also gets the type tag and customTags", () => {
    const pooler = makePooler([
      makePoolData("BookBot", 1, {
        customTags: [{ tag: "color", value: "#0000ff" }] as any,
      }),
    ]);
    pooler.getObject("BookBot"); // drain pool
    createMock.mockClear();
    const obj = pooler.getObject("BookBot"); // on-demand creation
    expect(obj.tags["type"]).toBe("BookBot");
    expect(obj.tags["color"]).toBe("#0000ff");
  });
});

// ─── getObjects ───────────────────────────────────────────────────────────────

describe("getObjects", () => {
  it("returns the requested number of objects", () => {
    const pooler = makePooler([makePoolData("BookBot", 3)]);
    expect(pooler.getObjects("BookBot", 3)).toHaveLength(3);
  });

  it("returns an empty array when amount is 0", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    expect(pooler.getObjects("BookBot", 0)).toHaveLength(0);
  });

  it("all returned objects have isInUse=true", () => {
    const pooler = makePooler([makePoolData("BookBot", 2)]);
    const objs = pooler.getObjects("BookBot", 2);
    expect(objs.every((o) => o.tags.isInUse === true)).toBe(true);
  });

  it("returns distinct objects for each slot", () => {
    const pooler = makePooler([makePoolData("BookBot", 2)]);
    const [a, b] = pooler.getObjects("BookBot", 2);
    expect(a.id).not.toBe(b.id);
  });
});

// ─── releaseObject ────────────────────────────────────────────────────────────

describe("releaseObject", () => {
  it("calls clearTagMasks on the released object", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    const obj = pooler.getObject("BookBot");
    pooler.releaseObject(obj, "BookBot");
    expect(clearTagMasksMock).toHaveBeenCalledWith(obj);
  });

  it("calls clearAnimations on the released object", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    const obj = pooler.getObject("BookBot");
    pooler.releaseObject(obj, "BookBot");
    expect(clearAnimationsMock).toHaveBeenCalledWith(obj);
  });

  it("sets isInUse=false on the released object", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    const obj = pooler.getObject("BookBot");
    pooler.releaseObject(obj, "BookBot");
    expect(obj.tags.isInUse).toBe(false);
  });

  it("sets the dimension tag to false using the value from getDimension", () => {
    const dimensionGetter = makeDimensionGetter("scene3d");
    const pooler = makePooler([makePoolData("BookBot", 1)], dimensionGetter);
    const obj = pooler.getObject("BookBot");
    pooler.releaseObject(obj, "BookBot");
    expect(obj.tags["scene3d"]).toBe(false);
  });

  it("calls getDimension exactly once per release", () => {
    const dimensionGetter = makeDimensionGetter();
    const pooler = makePooler([makePoolData("BookBot", 1)], dimensionGetter);
    const obj = pooler.getObject("BookBot");
    pooler.releaseObject(obj, "BookBot");
    expect(dimensionGetter.getDimension).toHaveBeenCalledTimes(1);
  });

  it("applies cleanupCustomTags when defined", () => {
    const pooler = makePooler([
      makePoolData("BookBot", 1, {
        cleanupCustomTags: [{ tag: "color", value: null }] as any,
      }),
    ]);
    const obj = pooler.getObject("BookBot");
    pooler.releaseObject(obj, "BookBot");
    expect(obj.tags["color"]).toBeNull();
  });

  it("does not throw when cleanupCustomTags is undefined", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    const obj = pooler.getObject("BookBot");
    expect(() => pooler.releaseObject(obj, "BookBot")).not.toThrow();
  });

  it("returns the object to the pool so it can be retrieved again", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    const obj = pooler.getObject("BookBot");
    const idBefore = obj.id;
    pooler.releaseObject(obj, "BookBot");
    const recycled = pooler.getObject("BookBot");
    expect(recycled.id).toBe(idBefore);
  });

  it("does not call clearTagMasks when the object is not in inUseObjects", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    const impostor = { id: "unknown-id", tags: {} } as any;
    pooler.releaseObject(impostor, "BookBot");
    expect(clearTagMasksMock).not.toHaveBeenCalled();
  });

  it("does not call clearAnimations when the object is not in inUseObjects", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    const impostor = { id: "unknown-id", tags: {} } as any;
    pooler.releaseObject(impostor, "BookBot");
    expect(clearAnimationsMock).not.toHaveBeenCalled();
  });

  it("matches by id — a different object with the same id is found and released", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    const obj = pooler.getObject("BookBot");
    const sameIdDifferentRef = { id: obj.id, tags: {} } as any;
    pooler.releaseObject(sameIdDifferentRef, "BookBot");
    expect(clearTagMasksMock).toHaveBeenCalled();
  });
});

// ─── releaseObjects ───────────────────────────────────────────────────────────

describe("releaseObjects", () => {
  it("calls releaseObject for each object in the array", () => {
    const pooler = makePooler([makePoolData("BookBot", 2)]);
    const objs = pooler.getObjects("BookBot", 2);
    pooler.releaseObjects(objs, "BookBot");
    expect(clearTagMasksMock).toHaveBeenCalledTimes(2);
  });

  it("is a no-op for an empty array", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    expect(() => pooler.releaseObjects([], "BookBot")).not.toThrow();
    expect(clearTagMasksMock).not.toHaveBeenCalled();
  });

  it("all objects have isInUse=false after release", () => {
    const pooler = makePooler([makePoolData("BookBot", 2)]);
    const objs = pooler.getObjects("BookBot", 2);
    pooler.releaseObjects(objs, "BookBot");
    expect(objs.every((o) => o.tags.isInUse === false)).toBe(true);
  });
});

// ─── disposeAllPools ──────────────────────────────────────────────────────────

describe("disposeAllPools", () => {
  it("calls destroy on every pooled object", () => {
    const pooler = makePooler([makePoolData("BookBot", 2)]);
    pooler.disposeAllPools();
    expect(destroyMock).toHaveBeenCalledTimes(2);
  });

  it("calls destroy on each object that was in the objectPool", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    const obj = pooler.getObject("BookBot");
    pooler.releaseObject(obj, "BookBot");
    pooler.disposeAllPools();
    expect(destroyMock).toHaveBeenCalledWith(obj);
  });

  it("releases in-use objects before destroying, so all objects are destroyed", () => {
    const pooler = makePooler([makePoolData("BookBot", 2)]);
    pooler.getObject("BookBot"); // move one object to inUseObjects
    pooler.disposeAllPools();
    // All 2 objects (1 in pool + 1 in use) must be destroyed
    expect(destroyMock).toHaveBeenCalledTimes(2);
  });

  it("makes getObject throw after the pool has been disposed", () => {
    const pooler = makePooler([makePoolData("BookBot", 1)]);
    pooler.disposeAllPools();
    expect(() => pooler.getObject("BookBot")).toThrow(
      "ObjectPooler: pool not registered for key BookBot"
    );
  });

  it("disposes all pools when multiple pools are registered", () => {
    const pooler = makePooler([
      makePoolData("BookBot", 1),
      makePoolData("ChapterBot", 2),
    ]);
    pooler.disposeAllPools();
    expect(destroyMock).toHaveBeenCalledTimes(3);
  });

  it("is a no-op when there are no pools", () => {
    const pooler = makePooler([]);
    expect(() => pooler.disposeAllPools()).not.toThrow();
    expect(destroyMock).not.toHaveBeenCalled();
  });
});
