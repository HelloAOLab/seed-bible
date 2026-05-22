import { LabelsConfigProvider } from "bibleVizUtils.infrastructure.config.labels.LabelsConfigProvider";
import { Fonts } from "bibleVizUtils.infrastructure.config.labels.fonts";
import { DialogBoxFormAddresses } from "bibleVizUtils.infrastructure.config.labels.formAddresses";
import { LabelDateConfigs } from "bibleVizUtils.infrastructure.config.labels.date";
import {
  ShowAnimationDurationMap,
  ShowAnimationConfig,
} from "bibleVizUtils.infrastructure.config.labels.showAnimation";
import { ShowSequencePacings } from "bibleVizUtils.domain.models.label";

const makeProvider = () => new LabelsConfigProvider();

// ─── getFontData ──────────────────────────────────────────────────────────────

describe("getFontData", () => {
  it("returns the Roboto font data", () => {
    expect(makeProvider().getFontData("Roboto")).toBe(Fonts.Roboto);
  });

  it("returned object has a pages array", () => {
    expect(Array.isArray(makeProvider().getFontData("Roboto").pages)).toBe(
      true
    );
  });

  it("returned object has a chars array", () => {
    expect(Array.isArray(makeProvider().getFontData("Roboto").chars)).toBe(
      true
    );
  });

  it("returned object has a kernings array", () => {
    expect(Array.isArray(makeProvider().getFontData("Roboto").kernings)).toBe(
      true
    );
  });

  it("returned object has an info property", () => {
    expect(makeProvider().getFontData("Roboto").info).toBeDefined();
  });

  it("returned object has a common property", () => {
    expect(makeProvider().getFontData("Roboto").common).toBeDefined();
  });

  it("returns the same reference on successive calls", () => {
    const provider = makeProvider();
    expect(provider.getFontData("Roboto")).toBe(provider.getFontData("Roboto"));
  });

  it("covers all keys defined in Fonts", () => {
    const provider = makeProvider();
    for (const key of Object.keys(Fonts) as Array<keyof typeof Fonts>) {
      expect(provider.getFontData(key)).toBe(Fonts[key]);
    }
  });
});

// ─── getDialogBoxFormAddresses ────────────────────────────────────────────────

describe("getDialogBoxFormAddresses", () => {
  it("returns the DialogBoxFormAddresses object", () => {
    expect(makeProvider().getDialogBoxFormAddresses()).toBe(
      DialogBoxFormAddresses
    );
  });

  it("returns the same reference on successive calls", () => {
    const provider = makeProvider();
    expect(provider.getDialogBoxFormAddresses()).toBe(
      provider.getDialogBoxFormAddresses()
    );
  });

  it("returns a non-empty object", () => {
    expect(
      Object.keys(makeProvider().getDialogBoxFormAddresses()).length
    ).toBeGreaterThan(0);
  });
});

// ─── getDialogBoxFormAddress ──────────────────────────────────────────────────

describe("getDialogBoxFormAddress", () => {
  it("returns the exact value for every key in DialogBoxFormAddresses", () => {
    const provider = makeProvider();
    for (const key of Object.keys(DialogBoxFormAddresses) as Array<
      keyof typeof DialogBoxFormAddresses
    >) {
      expect(provider.getDialogBoxFormAddress(key)).toBe(
        DialogBoxFormAddresses[key]
      );
    }
  });

  it("returns a string for a known aspect-ratio key", () => {
    const provider = makeProvider();
    const key = Object.keys(
      DialogBoxFormAddresses
    )[0] as keyof typeof DialogBoxFormAddresses;
    expect(typeof provider.getDialogBoxFormAddress(key)).toBe("string");
  });

  it("returns the same reference on successive calls for the same key", () => {
    const provider = makeProvider();
    const key = Object.keys(
      DialogBoxFormAddresses
    )[0] as keyof typeof DialogBoxFormAddresses;
    expect(provider.getDialogBoxFormAddress(key)).toBe(
      provider.getDialogBoxFormAddress(key)
    );
  });
});

// ─── getDialogBoxAspectRatios ─────────────────────────────────────────────────

describe("getDialogBoxAspectRatios", () => {
  it("returns an array", () => {
    expect(Array.isArray(makeProvider().getDialogBoxAspectRatios())).toBe(true);
  });

  it("has one entry per key in DialogBoxFormAddresses", () => {
    expect(makeProvider().getDialogBoxAspectRatios()).toHaveLength(
      Object.keys(DialogBoxFormAddresses).length
    );
  });

  it("contains numeric values (aspect ratios parsed as numbers)", () => {
    for (const ratio of makeProvider().getDialogBoxAspectRatios()) {
      expect(typeof ratio).toBe("number");
    }
  });

  it("includes the 0.5 aspect ratio", () => {
    expect(makeProvider().getDialogBoxAspectRatios()).toContain(0.5);
  });

  it("includes the 4.396 aspect ratio", () => {
    expect(makeProvider().getDialogBoxAspectRatios()).toContain(4.396);
  });

  it("all returned numbers are valid keys of DialogBoxFormAddresses", () => {
    const provider = makeProvider();
    const validKeys = Object.keys(DialogBoxFormAddresses).map(Number);
    for (const ratio of provider.getDialogBoxAspectRatios()) {
      expect(validKeys).toContain(ratio);
    }
  });
});

// ─── getDateConfig ────────────────────────────────────────────────────────────

describe("getDateConfig", () => {
  it("returns the exact value for every key in LabelDateConfigs", () => {
    const provider = makeProvider();
    for (const key of Object.keys(LabelDateConfigs) as Array<
      keyof typeof LabelDateConfigs
    >) {
      expect(provider.getDateConfig(key)).toBe(LabelDateConfigs[key]);
    }
  });

  it("returns absoluteDateScales", () => {
    expect(makeProvider().getDateConfig("absoluteDateScales")).toBe(
      LabelDateConfigs.absoluteDateScales
    );
  });

  it("absoluteDateScales has x and y properties", () => {
    const scales = makeProvider().getDateConfig("absoluteDateScales");
    expect(scales).toHaveProperty("x");
    expect(scales).toHaveProperty("y");
  });

  it("returns relativeDateScales", () => {
    expect(makeProvider().getDateConfig("relativeDateScales")).toBe(
      LabelDateConfigs.relativeDateScales
    );
  });

  it("returns absoluteDateFormAddress as a string", () => {
    expect(typeof makeProvider().getDateConfig("absoluteDateFormAddress")).toBe(
      "string"
    );
  });

  it("returns relativeDateFormAddress as a string", () => {
    expect(typeof makeProvider().getDateConfig("relativeDateFormAddress")).toBe(
      "string"
    );
  });

  it("returns the same reference on successive calls for the same key", () => {
    const provider = makeProvider();
    expect(provider.getDateConfig("absoluteDateScales")).toBe(
      provider.getDateConfig("absoluteDateScales")
    );
  });

  it("covers all keys defined in LabelDateConfigs", () => {
    const provider = makeProvider();
    const keys = Object.keys(LabelDateConfigs) as Array<
      keyof typeof LabelDateConfigs
    >;
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(provider.getDateConfig(key)).toBeDefined();
    }
  });
});

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

  it("returns the same reference on successive calls", () => {
    const provider = makeProvider();
    expect(provider.getShowAnimationConfig("easing")).toBe(
      provider.getShowAnimationConfig("easing")
    );
  });
});
