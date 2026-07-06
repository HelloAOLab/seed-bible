import { StackSpacings } from "bibleVizUtils.infrastructure.config.stacks.spacings";
import { StackAnimationsDuration } from "bibleVizUtils.infrastructure.config.stacks.animations";

// measurements.tsx calls new Vector3(...) and new Vector2(...) at module scope,
// so both globals must be defined before the module is first imported.

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

(globalThis as any).Vector2 = Vec2;
(globalThis as any).Vector3 = Vec3;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  StackConfigProvider,
} = require("bibleVizUtils.infrastructure.config.stacks.StackConfigProvider");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  StackPieceMeasurements,
} = require("bibleVizUtils.infrastructure.config.stacks.measurements");

const makeProvider = () => new StackConfigProvider();

// ─── getStackPieceMeasurements ────────────────────────────────────────────────

describe("getStackPieceMeasurements", () => {
  it("returns the StackPieceMeasurements object", () => {
    expect(makeProvider().getStackPieceMeasurements()).toBe(
      StackPieceMeasurements
    );
  });

  it("returns the same reference on successive calls", () => {
    const provider = makeProvider();
    expect(provider.getStackPieceMeasurements()).toBe(
      provider.getStackPieceMeasurements()
    );
  });

  it("returns a non-empty object", () => {
    expect(
      Object.keys(makeProvider().getStackPieceMeasurements()).length
    ).toBeGreaterThan(0);
  });
});

// ─── getStackPieceMeasurement ─────────────────────────────────────────────────

describe("getStackPieceMeasurement", () => {
  it("returns the exact value for every key in StackPieceMeasurements", () => {
    const provider = makeProvider();
    for (const key of Object.keys(StackPieceMeasurements) as Array<
      keyof typeof StackPieceMeasurements
    >) {
      expect(provider.getStackPieceMeasurement(key)).toBe(
        StackPieceMeasurements[key]
      );
    }
  });

  it("returns ChapterWidth as 0.5", () => {
    expect(makeProvider().getStackPieceMeasurement("ChapterWidth")).toBe(0.5);
  });

  it("returns ChapterHeight as 0.5", () => {
    expect(makeProvider().getStackPieceMeasurement("ChapterHeight")).toBe(0.5);
  });

  it("returns MinChapterBackDepth as 0.5", () => {
    expect(makeProvider().getStackPieceMeasurement("MinChapterBackDepth")).toBe(
      0.5
    );
  });

  it("returns ChapterFrontDepth as 0.01", () => {
    expect(
      makeProvider().getStackPieceMeasurement("ChapterFrontDepth")
    ).toBeCloseTo(0.01);
  });

  it("returns ChapterFrontSelectedDepth as 0.25", () => {
    expect(
      makeProvider().getStackPieceMeasurement("ChapterFrontSelectedDepth")
    ).toBe(0.25);
  });

  it("returns EmptySectionShadowScaleZ as 1", () => {
    expect(
      makeProvider().getStackPieceMeasurement("EmptySectionShadowScaleZ")
    ).toBe(1);
  });

  it("returns CoverScales as a Vec3 instance", () => {
    expect(
      makeProvider().getStackPieceMeasurement("CoverScales")
    ).toBeInstanceOf(Vec3);
  });

  it("CoverScales has x=2.53, y=3.85, z=0.1", () => {
    const v = makeProvider().getStackPieceMeasurement("CoverScales");
    expect(v.x).toBeCloseTo(2.53);
    expect(v.y).toBeCloseTo(3.85);
    expect(v.z).toBeCloseTo(0.1);
  });

  it("returns TestamentScales as a Vec3 instance", () => {
    expect(
      makeProvider().getStackPieceMeasurement("TestamentScales")
    ).toBeInstanceOf(Vec3);
  });

  it("TestamentScales has x=2.27, y=3.47, z=0.825", () => {
    const v = makeProvider().getStackPieceMeasurement("TestamentScales");
    expect(v.x).toBeCloseTo(2.27);
    expect(v.y).toBeCloseTo(3.47);
    expect(v.z).toBeCloseTo(0.825);
  });

  it("returns SectionScales as a Vec2 instance", () => {
    expect(
      makeProvider().getStackPieceMeasurement("SectionScales")
    ).toBeInstanceOf(Vec2);
  });

  it("SectionScales has x=2.04, y=3.12", () => {
    const v = makeProvider().getStackPieceMeasurement("SectionScales");
    expect(v.x).toBeCloseTo(2.04);
    expect(v.y).toBeCloseTo(3.12);
  });

  it("returns BookScales as a Vec2 instance", () => {
    expect(
      makeProvider().getStackPieceMeasurement("BookScales")
    ).toBeInstanceOf(Vec2);
  });

  it("BookScales has x=1.83, y=2.8", () => {
    const v = makeProvider().getStackPieceMeasurement("BookScales");
    expect(v.x).toBeCloseTo(1.83);
    expect(v.y).toBeCloseTo(2.8);
  });

  it("returns SectionAditionalScaleOnHover as 0.1", () => {
    expect(
      makeProvider().getStackPieceMeasurement("SectionAditionalScaleOnHover")
    ).toBeCloseTo(0.1);
  });

  it("returns SectionDesiredScaleZRatio as 0.02", () => {
    expect(
      makeProvider().getStackPieceMeasurement("SectionDesiredScaleZRatio")
    ).toBeCloseTo(0.02);
  });

  it("returns AditionalBookScaleOnHover as 0.1", () => {
    expect(
      makeProvider().getStackPieceMeasurement("AditionalBookScaleOnHover")
    ).toBeCloseTo(0.1);
  });

  it("returns LeftCoverScales as a Vec3 instance", () => {
    expect(
      makeProvider().getStackPieceMeasurement("LeftCoverScales")
    ).toBeInstanceOf(Vec3);
  });

  it("LeftCoverScales has x=0.15, y=3.85, z=0.75", () => {
    const v = makeProvider().getStackPieceMeasurement("LeftCoverScales");
    expect(v.x).toBeCloseTo(0.15);
    expect(v.y).toBeCloseTo(3.85);
    expect(v.z).toBeCloseTo(0.75);
  });

  it("returns CrossLineWidthRatio as 0.07", () => {
    expect(
      makeProvider().getStackPieceMeasurement("CrossLineWidthRatio")
    ).toBeCloseTo(0.07);
  });

  it("returns CrossLineDepth as 0.055", () => {
    expect(
      makeProvider().getStackPieceMeasurement("CrossLineDepth")
    ).toBeCloseTo(0.055);
  });

  it("returns TestamentAdditionalScaleOnHover as 0.1", () => {
    expect(
      makeProvider().getStackPieceMeasurement("TestamentAdditionalScaleOnHover")
    ).toBeCloseTo(0.1);
  });

  it("returns CrossHorizontalYOffsetRatio as 0.25", () => {
    expect(
      makeProvider().getStackPieceMeasurement("CrossHorizontalYOffsetRatio")
    ).toBe(0.25);
  });

  it("returns the same reference on successive calls for the same key", () => {
    const provider = makeProvider();
    expect(provider.getStackPieceMeasurement("CoverScales")).toBe(
      provider.getStackPieceMeasurement("CoverScales")
    );
  });

  it("covers all keys defined in StackPieceMeasurements", () => {
    const provider = makeProvider();
    const keys = Object.keys(StackPieceMeasurements) as Array<
      keyof typeof StackPieceMeasurements
    >;
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(provider.getStackPieceMeasurement(key)).toBeDefined();
    }
  });
});

// ─── getStackSpacings ─────────────────────────────────────────────────────────

describe("getStackSpacings", () => {
  it("returns the StackSpacings object", () => {
    expect(makeProvider().getStackSpacings()).toBe(StackSpacings);
  });

  it("returns the same reference on successive calls", () => {
    const provider = makeProvider();
    expect(provider.getStackSpacings()).toBe(provider.getStackSpacings());
  });

  it("returns a non-empty object", () => {
    expect(
      Object.keys(makeProvider().getStackSpacings()).length
    ).toBeGreaterThan(0);
  });
});

// ─── getStackSpacing ──────────────────────────────────────────────────────────

describe("getStackSpacing", () => {
  it("returns the exact value for every key in StackSpacings", () => {
    const provider = makeProvider();
    for (const key of Object.keys(StackSpacings) as Array<
      keyof typeof StackSpacings
    >) {
      expect(provider.getStackSpacing(key)).toBe(StackSpacings[key]);
    }
  });

  it("returns BetweenArrangements as 2.5", () => {
    expect(makeProvider().getStackSpacing("BetweenArrangements")).toBe(2.5);
  });

  it("returns BetweenSections as 0.5", () => {
    expect(makeProvider().getStackSpacing("BetweenSections")).toBe(0.5);
  });

  it("returns BetweenBooks as 0.08", () => {
    expect(makeProvider().getStackSpacing("BetweenBooks")).toBeCloseTo(0.08);
  });

  it("returns CoverToCross as 2", () => {
    expect(makeProvider().getStackSpacing("CoverToCross")).toBe(2);
  });

  it("returns ExplodedViewSectionPadding as 2", () => {
    expect(makeProvider().getStackSpacing("ExplodedViewSectionPadding")).toBe(
      2
    );
  });

  it("returns SelectedBookMargin as 1", () => {
    expect(makeProvider().getStackSpacing("SelectedBookMargin")).toBe(1);
  });

  it("returns ChapterGap as 0.05", () => {
    expect(makeProvider().getStackSpacing("ChapterGap")).toBeCloseTo(0.05);
  });

  it("returns BibleShadowOffsetZ as -1", () => {
    expect(makeProvider().getStackSpacing("BibleShadowOffsetZ")).toBe(-1);
  });

  it("returns BibleShadowOffsetX as 0", () => {
    expect(makeProvider().getStackSpacing("BibleShadowOffsetX")).toBe(0);
  });

  it("returns BibleTransformerInitialRotationZ as 0", () => {
    expect(
      makeProvider().getStackSpacing("BibleTransformerInitialRotationZ")
    ).toBe(0);
  });

  it("returns the same value on successive calls for the same key", () => {
    const provider = makeProvider();
    expect(provider.getStackSpacing("BetweenArrangements")).toBe(
      provider.getStackSpacing("BetweenArrangements")
    );
  });

  it("covers all keys defined in StackSpacings", () => {
    const provider = makeProvider();
    const keys = Object.keys(StackSpacings) as Array<
      keyof typeof StackSpacings
    >;
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(provider.getStackSpacing(key)).toBeDefined();
    }
  });
});

// ─── getStackAnimationsDuration ───────────────────────────────────────────────

describe("getStackAnimationsDuration", () => {
  it("returns the StackAnimationsDuration object", () => {
    expect(makeProvider().getStackAnimationsDuration()).toBe(
      StackAnimationsDuration
    );
  });

  it("returns the same reference on successive calls", () => {
    const provider = makeProvider();
    expect(provider.getStackAnimationsDuration()).toBe(
      provider.getStackAnimationsDuration()
    );
  });

  it("returns a non-empty object", () => {
    expect(
      Object.keys(makeProvider().getStackAnimationsDuration()).length
    ).toBeGreaterThan(0);
  });
});

// ─── getStackAnimationDuration ────────────────────────────────────────────────

describe("getStackAnimationDuration", () => {
  it("returns the exact value for every key in StackAnimationsDuration", () => {
    const provider = makeProvider();
    for (const key of Object.keys(StackAnimationsDuration) as Array<
      keyof typeof StackAnimationsDuration
    >) {
      expect(provider.getStackAnimationDuration(key)).toBe(
        StackAnimationsDuration[key]
      );
    }
  });

  it("returns Highlight as 0.15", () => {
    expect(makeProvider().getStackAnimationDuration("Highlight")).toBeCloseTo(
      0.15
    );
  });

  it("returns Unhighlight as 0.15", () => {
    expect(makeProvider().getStackAnimationDuration("Unhighlight")).toBeCloseTo(
      0.15
    );
  });

  it("returns Rehighlight as 0.15", () => {
    expect(makeProvider().getStackAnimationDuration("Rehighlight")).toBeCloseTo(
      0.15
    );
  });

  it("returns IncreaseHighlight as 0.15", () => {
    expect(
      makeProvider().getStackAnimationDuration("IncreaseHighlight")
    ).toBeCloseTo(0.15);
  });

  it("all durations are positive numbers", () => {
    const provider = makeProvider();
    for (const key of Object.keys(StackAnimationsDuration) as Array<
      keyof typeof StackAnimationsDuration
    >) {
      expect(provider.getStackAnimationDuration(key)).toBeGreaterThan(0);
    }
  });

  it("returns the same value on successive calls for the same key", () => {
    const provider = makeProvider();
    expect(provider.getStackAnimationDuration("Highlight")).toBe(
      provider.getStackAnimationDuration("Highlight")
    );
  });

  it("covers all keys defined in StackAnimationsDuration", () => {
    const provider = makeProvider();
    const keys = Object.keys(StackAnimationsDuration) as Array<
      keyof typeof StackAnimationsDuration
    >;
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(provider.getStackAnimationDuration(key)).toBeDefined();
    }
  });
});
