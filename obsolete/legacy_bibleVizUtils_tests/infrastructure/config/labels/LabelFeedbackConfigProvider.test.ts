import {
  ShowAnimationDurationMap,
  ShowAnimationConfig,
} from "bibleVizUtils.infrastructure.config.labels.showAnimation";
import {
  LabelPosition,
  LabelTranslucencyModes,
  ShowSequencePacings,
} from "bibleVizUtils.domain.models.label";

// directionMap in LabelFeedbackConfigProvider is a module-level const that calls
// new Vector2(...) at import time, so Vector2 must be defined before the module loads.

class Vec2 {
  constructor(
    public x = 0,
    public y = 0
  ) {}
}

(globalThis as any).Vector2 = Vec2;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  LabelFeedbackConfigProvider,
} = require("bibleVizUtils.infrastructure.config.labels.LabelFeedbackConfigProvider");

const makeProvider = () => new LabelFeedbackConfigProvider();

// ─── getShowAnimationDuration ─────────────────────────────────────────────────

describe("getShowAnimationDuration", () => {
  it("returns the Slow duration", () => {
    expect(
      makeProvider().getShowAnimationDuration(ShowSequencePacings.Slow)
    ).toBe(ShowAnimationDurationMap.Slow);
  });

  it("returns the Regular duration", () => {
    expect(
      makeProvider().getShowAnimationDuration(ShowSequencePacings.Regular)
    ).toBe(ShowAnimationDurationMap.Regular);
  });

  it("returns the Fast duration", () => {
    expect(
      makeProvider().getShowAnimationDuration(ShowSequencePacings.Fast)
    ).toBe(ShowAnimationDurationMap.Fast);
  });

  it("returns the Instant duration", () => {
    expect(
      makeProvider().getShowAnimationDuration(ShowSequencePacings.Instant)
    ).toBe(ShowAnimationDurationMap.Instant);
  });

  it("covers all pacing keys defined in ShowAnimationDurationMap", () => {
    const provider = makeProvider();
    for (const pacing of Object.keys(ShowAnimationDurationMap) as Array<
      keyof typeof ShowAnimationDurationMap
    >) {
      expect(provider.getShowAnimationDuration(pacing)).toBe(
        ShowAnimationDurationMap[pacing]
      );
    }
  });

  it("returns the same reference on successive calls for the same pacing", () => {
    const provider = makeProvider();
    expect(provider.getShowAnimationDuration("Regular")).toBe(
      provider.getShowAnimationDuration("Regular")
    );
  });
});

// ─── getShowAnimationConfig ───────────────────────────────────────────────────

describe("getShowAnimationConfig", () => {
  it("returns the easing config", () => {
    expect(makeProvider().getShowAnimationConfig("easing")).toBe(
      ShowAnimationConfig.easing
    );
  });

  it("easing has type 'sinusoidal'", () => {
    expect(makeProvider().getShowAnimationConfig("easing").type).toBe(
      "sinusoidal"
    );
  });

  it("easing has mode 'inout'", () => {
    expect(makeProvider().getShowAnimationConfig("easing").mode).toBe("inout");
  });

  it("covers all keys defined in ShowAnimationConfig", () => {
    const provider = makeProvider();
    for (const key of Object.keys(ShowAnimationConfig) as Array<
      keyof typeof ShowAnimationConfig
    >) {
      expect(provider.getShowAnimationConfig(key)).toBe(
        ShowAnimationConfig[key]
      );
    }
  });
});

// ─── getShakeAnimationDelay ───────────────────────────────────────────────────

describe("getShakeAnimationDelay", () => {
  it("returns 5000 ms", () => {
    expect(makeProvider().getShakeAnimationDelay()).toBe(5000);
  });

  it("returns the same value on successive calls", () => {
    const provider = makeProvider();
    expect(provider.getShakeAnimationDelay()).toBe(
      provider.getShakeAnimationDelay()
    );
  });
});

// ─── getShakeDuration ────────────────────────────────────────────────────────

describe("getShakeDuration", () => {
  it("returns 0.5", () => {
    expect(makeProvider().getShakeDuration()).toBe(0.5);
  });

  it("returns the same value on successive calls", () => {
    const provider = makeProvider();
    expect(provider.getShakeDuration()).toBe(provider.getShakeDuration());
  });
});

// ─── getShakeEasing ───────────────────────────────────────────────────────────

describe("getShakeEasing", () => {
  it("returns an easing with type 'sinusoidal'", () => {
    expect(makeProvider().getShakeEasing().type).toBe("sinusoidal");
  });

  it("returns an easing with mode 'inout'", () => {
    expect(makeProvider().getShakeEasing().mode).toBe("inout");
  });

  it("returns the same reference on successive calls", () => {
    const provider = makeProvider();
    expect(provider.getShakeEasing()).toBe(provider.getShakeEasing());
  });
});

// ─── getShakeDirection ────────────────────────────────────────────────────────

describe("getShakeDirection", () => {
  it("returns x=0.1, y=0 for LeftSided", () => {
    const dir = makeProvider().getShakeDirection(LabelPosition.LeftSided);
    expect(dir.x).toBeCloseTo(0.1);
    expect(dir.y).toBe(0);
  });

  it("returns x=-0.1, y=0 for RightSided", () => {
    const dir = makeProvider().getShakeDirection(LabelPosition.RightSided);
    expect(dir.x).toBeCloseTo(-0.1);
    expect(dir.y).toBe(0);
  });

  it("returns x=0, y=-0.1 for Top", () => {
    const dir = makeProvider().getShakeDirection(LabelPosition.Top);
    expect(dir.x).toBe(0);
    expect(dir.y).toBeCloseTo(-0.1);
  });

  it("returns x=-0.1, y=-0.1 for RightSidedCorner", () => {
    const dir = makeProvider().getShakeDirection(
      LabelPosition.RightSidedCorner
    );
    expect(dir.x).toBeCloseTo(-0.1);
    expect(dir.y).toBeCloseTo(-0.1);
  });

  it("returns a Vec2 instance for every position", () => {
    const provider = makeProvider();
    for (const position of Object.values(LabelPosition)) {
      expect(provider.getShakeDirection(position)).toBeInstanceOf(Vec2);
    }
  });

  it("returns the same reference on successive calls for the same position", () => {
    const provider = makeProvider();
    expect(provider.getShakeDirection(LabelPosition.RightSided)).toBe(
      provider.getShakeDirection(LabelPosition.RightSided)
    );
  });

  it("returns different references for different positions", () => {
    const provider = makeProvider();
    expect(provider.getShakeDirection(LabelPosition.LeftSided)).not.toBe(
      provider.getShakeDirection(LabelPosition.RightSided)
    );
  });
});

// ─── getIntensityOpacity ─────────────────────────────────────────────────────

describe("getIntensityOpacity", () => {
  it("returns 1 for Solid mode", () => {
    expect(
      makeProvider().getIntensityOpacity(LabelTranslucencyModes.Solid)
    ).toBe(1);
  });

  it("returns 0.75 for Faded mode", () => {
    expect(
      makeProvider().getIntensityOpacity(LabelTranslucencyModes.Faded)
    ).toBe(0.75);
  });

  it("covers all translucency modes", () => {
    const provider = makeProvider();
    for (const mode of Object.values(LabelTranslucencyModes)) {
      expect(typeof provider.getIntensityOpacity(mode)).toBe("number");
    }
  });

  it("returns the same value on successive calls for the same mode", () => {
    const provider = makeProvider();
    expect(provider.getIntensityOpacity(LabelTranslucencyModes.Solid)).toBe(
      provider.getIntensityOpacity(LabelTranslucencyModes.Solid)
    );
  });
});
