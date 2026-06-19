import { BookStackLayoutAdapter } from "@packages/Bible Stack/bibleStack/infrastructure/adapters/stacks/BookStackLayoutAdapter";

// ─── globals ──────────────────────────────────────────────────────────────────

class Vec2 {
  constructor(
    public x = 0,
    public y = 0
  ) {}
}
class Vec3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0
  ) {}
}

beforeEach(() => {
  (globalThis as any).Vector2 = Vec2;
  (globalThis as any).Vector3 = Vec3;
});

afterEach(() => {
  delete (globalThis as any).Vector2;
  delete (globalThis as any).Vector3;
});

// ─── factories ────────────────────────────────────────────────────────────────

const makeSpan = (from: number, to: number) => ({ from, to });
const makeLayout = (
  x: ReturnType<typeof makeSpan>,
  y: ReturnType<typeof makeSpan>
) => ({ x, y });
const makeVec2 = (x: number, y: number) => new Vec2(x, y) as any;
const makeVec3 = (x: number, y: number, z: number) => new Vec3(x, y, z) as any;

// full span helpers
const fullX = () => makeSpan(0, 1);
const fullY = () => makeSpan(0, 1);
const fullLayout = () => makeLayout(fullX(), fullY());

// ─── full span — no adjustments ────────────────────────────────────────────────

describe("full span (from=0, to=1) — no adjustments", () => {
  it("sets scale.x to baseScaleX * 1", () => {
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      fullLayout(),
      makeVec3(0, 0, 0),
      makeVec2(4, 2),
      1
    );
    expect(result.scale.x).toBe(4);
  });

  it("sets scale.y to baseScaleY * 1", () => {
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      fullLayout(),
      makeVec3(0, 0, 0),
      makeVec2(4, 2),
      1
    );
    expect(result.scale.y).toBe(2);
  });

  it("sets position.x equal to sectionPosition.x", () => {
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      fullLayout(),
      makeVec3(5, 10, 3),
      makeVec2(4, 2),
      1
    );
    expect(result.position.x).toBe(5);
  });

  it("sets position.y equal to sectionPosition.y", () => {
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      fullLayout(),
      makeVec3(5, 10, 3),
      makeVec2(4, 2),
      1
    );
    expect(result.position.y).toBe(10);
  });

  it("preserves sectionPosition.z in position.z", () => {
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      fullLayout(),
      makeVec3(0, 0, 7),
      makeVec2(4, 2),
      1
    );
    expect(result.position.z).toBe(7);
  });

  it("sets layoutPosition.x to 0", () => {
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      fullLayout(),
      makeVec3(0, 0, 0),
      makeVec2(4, 2),
      1
    );
    expect(result.layoutPosition.x).toBe(0);
  });

  it("sets layoutPosition.y to 0", () => {
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      fullLayout(),
      makeVec3(0, 0, 0),
      makeVec2(4, 2),
      1
    );
    expect(result.layoutPosition.y).toBe(0);
  });
});

// ─── left-edge span (from=0, to≠1) ───────────────────────────────────────────

describe("left-edge span (from=0, to≠1)", () => {
  // baseScaleX=4, span=0→0.5, spacing=2
  // initial scale = 4 * 0.5 = 2, then scale -= 2/2=1 → scale = 1
  // layoutPosition = 1/2 - 4/2 = 0.5 - 2 = -1.5
  // position = sectionPositionX + (-1.5)

  it("reduces scale.x by spacing/2", () => {
    const layout = makeLayout(makeSpan(0, 0.5), fullY());
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(5, 0, 0),
      makeVec2(4, 2),
      2
    );
    // 4 * 0.5 - 2/2 = 2 - 1 = 1
    expect(result.scale.x).toBe(1);
  });

  it("sets a negative layoutPosition.x (scale/2 - baseScale/2)", () => {
    const layout = makeLayout(makeSpan(0, 0.5), fullY());
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(5, 0, 0),
      makeVec2(4, 2),
      2
    );
    expect(result.layoutPosition.x).toBe(-1.5);
  });

  it("offsets position.x by layoutPosition.x", () => {
    const layout = makeLayout(makeSpan(0, 0.5), fullY());
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(5, 0, 0),
      makeVec2(4, 2),
      2
    );
    // 5 + (-1.5) = 3.5
    expect(result.position.x).toBe(3.5);
  });

  it("does not affect scale.y when only x is left-edge", () => {
    const layout = makeLayout(makeSpan(0, 0.5), fullY());
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(0, 0, 0),
      makeVec2(4, 2),
      2
    );
    expect(result.scale.y).toBe(2);
  });
});

// ─── right-edge span (from≠0, to=1) ──────────────────────────────────────────

describe("right-edge span (from≠0, to=1)", () => {
  // baseScaleX=4, span=0.5→1, spacing=2
  // initial scale = 4 * 0.5 = 2, then scale -= 2/2=1 → scale = 1
  // layoutPosition = 4/2 - 1/2 = 2 - 0.5 = 1.5
  // position = sectionPositionX + 1.5

  it("reduces scale.x by spacing/2", () => {
    const layout = makeLayout(makeSpan(0.5, 1), fullY());
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(5, 0, 0),
      makeVec2(4, 2),
      2
    );
    expect(result.scale.x).toBe(1);
  });

  it("sets a positive layoutPosition.x (baseScale/2 - scale/2)", () => {
    const layout = makeLayout(makeSpan(0.5, 1), fullY());
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(5, 0, 0),
      makeVec2(4, 2),
      2
    );
    expect(result.layoutPosition.x).toBe(1.5);
  });

  it("offsets position.x by layoutPosition.x", () => {
    const layout = makeLayout(makeSpan(0.5, 1), fullY());
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(5, 0, 0),
      makeVec2(4, 2),
      2
    );
    // 5 + 1.5 = 6.5
    expect(result.position.x).toBe(6.5);
  });

  it("does not affect scale.y when only x is right-edge", () => {
    const layout = makeLayout(makeSpan(0.5, 1), fullY());
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(0, 0, 0),
      makeVec2(4, 2),
      2
    );
    expect(result.scale.y).toBe(2);
  });
});

// ─── middle span (from≠0, to≠1) ──────────────────────────────────────────────

describe("middle span (from≠0, to≠1) — no adjustments", () => {
  // baseScaleX=4, span=0.25→0.75, spacing=2
  // scale = 4 * 0.5 = 2  (no adjustment)
  // layoutPosition = 0
  // position = sectionPositionX

  it("sets scale.x to baseScaleX * spanWidth without adjustment", () => {
    const layout = makeLayout(makeSpan(0.25, 0.75), fullY());
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(5, 0, 0),
      makeVec2(4, 2),
      2
    );
    expect(result.scale.x).toBe(2);
  });

  it("sets layoutPosition.x to 0", () => {
    const layout = makeLayout(makeSpan(0.25, 0.75), fullY());
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(5, 0, 0),
      makeVec2(4, 2),
      2
    );
    expect(result.layoutPosition.x).toBe(0);
  });

  it("sets position.x equal to sectionPosition.x", () => {
    const layout = makeLayout(makeSpan(0.25, 0.75), fullY());
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(5, 0, 0),
      makeVec2(4, 2),
      2
    );
    expect(result.position.x).toBe(5);
  });
});

// ─── y-axis independent adjustments ──────────────────────────────────────────

describe("y-axis adjustments are independent from x-axis", () => {
  it("applies left-edge adjustment to y independently", () => {
    // baseScaleY=6, span=0→0.5, spacing=2
    // scale = 6*0.5=3, scale-=1 → 2
    // layoutPosition = 2/2 - 6/2 = 1 - 3 = -2
    const layout = makeLayout(fullX(), makeSpan(0, 0.5));
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(0, 10, 0),
      makeVec2(4, 6),
      2
    );
    expect(result.scale.y).toBe(2);
    expect(result.layoutPosition.y).toBe(-2);
    expect(result.position.y).toBe(8);
  });

  it("applies right-edge adjustment to y independently", () => {
    // baseScaleY=6, span=0.5→1, spacing=2
    // scale = 6*0.5=3, scale-=1 → 2
    // layoutPosition = 6/2 - 2/2 = 3 - 1 = 2
    const layout = makeLayout(fullX(), makeSpan(0.5, 1));
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      layout,
      makeVec3(0, 10, 0),
      makeVec2(4, 6),
      2
    );
    expect(result.scale.y).toBe(2);
    expect(result.layoutPosition.y).toBe(2);
    expect(result.position.y).toBe(12);
  });
});

// ─── return types and default sectionPosition ────────────────────────────────

describe("return types and default sectionPosition", () => {
  it("returns a Vector2 instance for scale", () => {
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      fullLayout(),
      makeVec3(0, 0, 0),
      makeVec2(2, 2),
      0
    );
    expect(result.scale).toBeInstanceOf(Vec2);
  });

  it("returns a Vector3 instance for position", () => {
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      fullLayout(),
      makeVec3(0, 0, 0),
      makeVec2(2, 2),
      0
    );
    expect(result.position).toBeInstanceOf(Vec3);
  });

  it("returns a Vector2 instance for layoutPosition", () => {
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      fullLayout(),
      makeVec3(0, 0, 0),
      makeVec2(2, 2),
      0
    );
    expect(result.layoutPosition).toBeInstanceOf(Vec2);
  });

  it("defaults sectionPosition to (0,0,0) when not provided", () => {
    const result = new BookStackLayoutAdapter().computeGroupBookProperties(
      fullLayout(),
      undefined as any,
      makeVec2(4, 2),
      1
    );
    expect(result.position.x).toBe(0);
    expect(result.position.y).toBe(0);
    expect(result.position.z).toBe(0);
  });
});
