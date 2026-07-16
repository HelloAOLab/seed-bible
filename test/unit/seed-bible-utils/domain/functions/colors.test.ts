import {
  ClampRGBColor,
  HexToRgb,
  RgbToHex,
  GetColorType,
  HexShortToLong,
  HexLongToShort,
  RGBStringToArray,
  ColorParser,
  GetTextColorBasedOnBackground,
  GetDarkerColor,
  GetChildrenLevelColors,
  ComputeConicGradient,
  ComputeLinearGradient,
  InterpolateHexColors,
  GetRandomColor,
  ComputeRawGradientColors,
} from "../../../../../packages/seed-bible-utils/domain/functions/colors";

// ─── ClampRGBColor ────────────────────────────────────────────────────────────

describe("ClampRGBColor", () => {
  it("returns values within [0, 255] unchanged", () => {
    expect(ClampRGBColor([100, 150, 200])).toEqual([100, 150, 200]);
  });

  it("clamps values above 255 to 255", () => {
    expect(ClampRGBColor([300, 256, 1000])).toEqual([255, 255, 255]);
  });

  it("clamps values below 0 to 0", () => {
    expect(ClampRGBColor([-1, -100, -0.5])).toEqual([0, 0, 0]);
  });

  it("rounds fractional values before clamping", () => {
    expect(ClampRGBColor([127.6, 0.4, 254.5])).toEqual([128, 0, 255]);
  });

  it("clamps mixed over/under/in-range channels independently", () => {
    expect(ClampRGBColor([-10, 128, 300])).toEqual([0, 128, 255]);
  });

  it("handles the boundary values 0 and 255 exactly", () => {
    expect(ClampRGBColor([0, 255, 128])).toEqual([0, 255, 128]);
  });
});

// ─── HexToRgb ─────────────────────────────────────────────────────────────────

describe("HexToRgb", () => {
  it("converts a 6-char hex with # prefix", () => {
    expect(HexToRgb({ hexColor: "#ff0000" })).toEqual([255, 0, 0]);
  });

  it("converts a 6-char hex without # prefix", () => {
    expect(HexToRgb({ hexColor: "ff0000" })).toEqual([255, 0, 0]);
  });

  it("expands a 3-char short hex with # prefix", () => {
    expect(HexToRgb({ hexColor: "#f00" })).toEqual([255, 0, 0]);
  });

  it("expands a 3-char short hex without # prefix", () => {
    expect(HexToRgb({ hexColor: "abc" })).toEqual([170, 187, 204]);
  });

  it("handles uppercase hex digits", () => {
    expect(HexToRgb({ hexColor: "#FF8000" })).toEqual([255, 128, 0]);
  });

  it("handles mixed case hex digits", () => {
    expect(HexToRgb({ hexColor: "#Ff8000" })).toEqual([255, 128, 0]);
  });

  it("converts white (#ffffff)", () => {
    expect(HexToRgb({ hexColor: "#ffffff" })).toEqual([255, 255, 255]);
  });

  it("converts black (#000000)", () => {
    expect(HexToRgb({ hexColor: "#000000" })).toEqual([0, 0, 0]);
  });

  it("trims surrounding whitespace", () => {
    expect(HexToRgb({ hexColor: "  #ff0000  " })).toEqual([255, 0, 0]);
  });

  it("returns [0, 0, 0] and warns for an invalid hex string", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(HexToRgb({ hexColor: "#zzzzzz" })).toEqual([0, 0, 0]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid color")
    );
    warnSpy.mockRestore();
  });

  it("returns [0, 0, 0] for a string with wrong length", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(HexToRgb({ hexColor: "#1234" })).toEqual([0, 0, 0]);
    warnSpy.mockRestore();
  });
});

// ─── RgbToHex ─────────────────────────────────────────────────────────────────

describe("RgbToHex", () => {
  it("converts red [255, 0, 0] to #ff0000", () => {
    expect(RgbToHex({ rgbColor: [255, 0, 0] })).toBe("#ff0000");
  });

  it("converts green [0, 255, 0] to #00ff00", () => {
    expect(RgbToHex({ rgbColor: [0, 255, 0] })).toBe("#00ff00");
  });

  it("converts blue [0, 0, 255] to #0000ff", () => {
    expect(RgbToHex({ rgbColor: [0, 0, 255] })).toBe("#0000ff");
  });

  it("converts white [255, 255, 255] to #ffffff", () => {
    expect(RgbToHex({ rgbColor: [255, 255, 255] })).toBe("#ffffff");
  });

  it("converts black [0, 0, 0] to #000000", () => {
    expect(RgbToHex({ rgbColor: [0, 0, 0] })).toBe("#000000");
  });

  it("pads single-digit channel values with a leading zero", () => {
    expect(RgbToHex({ rgbColor: [2, 183, 190] })).toBe("#02b7be");
  });

  it("round-trips correctly with HexToRgb", () => {
    const original = "#3a7fcc";
    const rgb = HexToRgb({ hexColor: original });
    expect(RgbToHex({ rgbColor: rgb })).toBe(original);
  });
});

// ─── GetColorType ─────────────────────────────────────────────────────────────

describe("GetColorType", () => {
  it("returns 'arrayRGB' for an array input", () => {
    expect(GetColorType([255, 0, 0])).toBe("arrayRGB");
  });

  it("returns 'stringRGB' for an rgb() string", () => {
    expect(GetColorType("rgb(255, 0, 0)")).toBe("stringRGB");
  });

  it("returns 'stringRGB' for an rgba() string", () => {
    expect(GetColorType("rgba(255, 0, 0, 0.5)")).toBe("stringRGB");
  });

  it("returns 'longHex' for a 6-char hex with # prefix", () => {
    expect(GetColorType("#ff0000")).toBe("longHex");
  });

  it("returns 'longHex' for a 6-char hex without # prefix", () => {
    expect(GetColorType("ff0000")).toBe("longHex");
  });

  it("returns 'shortHex' for a 3-char hex with # prefix", () => {
    expect(GetColorType("#f00")).toBe("shortHex");
  });

  it("returns 'shortHex' for a 3-char hex without # prefix", () => {
    expect(GetColorType("f00")).toBe("shortHex");
  });

  it("returns false for an unrecognized string", () => {
    expect(GetColorType("not-a-color")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(GetColorType("")).toBe(false);
  });
});

// ─── HexShortToLong ───────────────────────────────────────────────────────────

describe("HexShortToLong", () => {
  it("expands a 3-char hex with # prefix", () => {
    expect(HexShortToLong("#f00")).toBe("#ff0000");
  });

  it("expands a 3-char hex without # prefix", () => {
    expect(HexShortToLong("f00")).toBe("#ff0000");
  });

  it("expands #abc to #aabbcc", () => {
    expect(HexShortToLong("#abc")).toBe("#aabbcc");
  });

  it("preserves uppercase characters when expanding", () => {
    expect(HexShortToLong("#F0A")).toBe("#FF00AA");
  });
});

// ─── HexLongToShort ───────────────────────────────────────────────────────────

describe("HexLongToShort", () => {
  it("compresses a compressible hex with # prefix", () => {
    expect(HexLongToShort("#aabbcc")).toBe("#abc");
  });

  it("compresses #ffffff to #fff", () => {
    expect(HexLongToShort("#ffffff")).toBe("#fff");
  });

  it("returns the original string when the hex is not compressible", () => {
    expect(HexLongToShort("#ab1234")).toBe("#ab1234");
  });

  it("compresses a hex without # prefix and adds # to result", () => {
    expect(HexLongToShort("aabbcc")).toBe("#abc");
  });

  it("returns the original input when not compressible and no # prefix", () => {
    expect(HexLongToShort("ab1234")).toBe("ab1234");
  });
});

// ─── RGBStringToArray ─────────────────────────────────────────────────────────

describe("RGBStringToArray", () => {
  it("parses an rgb() string", () => {
    expect(RGBStringToArray("rgb(255, 0, 0)")).toEqual([255, 0, 0]);
  });

  it("parses an rgba() string and ignores the alpha channel", () => {
    expect(RGBStringToArray("rgba(0, 128, 255, 0.5)")).toEqual([0, 128, 255]);
  });

  it("parses without spaces between values", () => {
    expect(RGBStringToArray("rgb(255,0,0)")).toEqual([255, 0, 0]);
  });

  it("parses with extra spaces around values", () => {
    expect(RGBStringToArray("rgb( 10 , 20 , 30 )")).toEqual([10, 20, 30]);
  });

  it("returns [0, 0, 0] for a non-matching string", () => {
    expect(RGBStringToArray("not-a-color")).toEqual([0, 0, 0]);
  });
});

// ─── ColorParser ─────────────────────────────────────────────────────────────

describe("ColorParser", () => {
  it("returns the value unchanged when source and target types match", () => {
    expect(ColorParser("#ff0000", "longHex")).toBe("#ff0000");
  });

  it("converts arrayRGB to stringRGB", () => {
    expect(ColorParser([255, 0, 0], "stringRGB")).toBe("rgba(255, 0, 0, 1)");
  });

  it("converts arrayRGB to longHex", () => {
    expect(ColorParser([255, 0, 0], "longHex")).toBe("#ff0000");
  });

  it("converts arrayRGB to shortHex", () => {
    expect(ColorParser([255, 0, 0], "shortHex")).toBe("#f00");
  });

  it("converts stringRGB to arrayRGB", () => {
    expect(ColorParser("rgb(0, 128, 255)", "arrayRGB")).toEqual([0, 128, 255]);
  });

  it("converts longHex to arrayRGB", () => {
    expect(ColorParser("#00ff00", "arrayRGB")).toEqual([0, 255, 0]);
  });

  it("converts longHex to stringRGB", () => {
    expect(ColorParser("#0000ff", "stringRGB")).toBe("rgba(0, 0, 255, 1)");
  });

  it("converts shortHex to longHex via expansion", () => {
    expect(ColorParser("#f00", "longHex")).toBe("#ff0000");
  });
});

// ─── GetTextColorBasedOnBackground ───────────────────────────────────────────

describe("GetTextColorBasedOnBackground", () => {
  it("returns '#000000' (black) for a white background", () => {
    expect(GetTextColorBasedOnBackground({ backgroundColor: "#ffffff" })).toBe(
      "#000000"
    );
  });

  it("returns '#ffffff' (white) for a black background", () => {
    expect(GetTextColorBasedOnBackground({ backgroundColor: "#000000" })).toBe(
      "#ffffff"
    );
  });

  it("returns '#000000' for a light gray background (#cccccc)", () => {
    expect(GetTextColorBasedOnBackground({ backgroundColor: "#cccccc" })).toBe(
      "#000000"
    );
  });

  it("returns '#ffffff' for a dark background (#333333)", () => {
    expect(GetTextColorBasedOnBackground({ backgroundColor: "#333333" })).toBe(
      "#ffffff"
    );
  });

  it("accepts a WeightedColor array and averages luminance by weight", () => {
    const result = GetTextColorBasedOnBackground({
      backgroundColor: [
        { color: "#ffffff", value: 1 },
        { color: "#000000", value: 1 },
      ],
    });
    expect(result).toBe("#000000");
  });

  it("treats a single-item WeightedColor array the same as a plain hex", () => {
    const fromArray = GetTextColorBasedOnBackground({
      backgroundColor: [{ color: "#ffffff", value: 1 }],
    });
    const fromHex = GetTextColorBasedOnBackground({
      backgroundColor: "#ffffff",
    });
    expect(fromArray).toBe(fromHex);
  });
});

// ─── GetDarkerColor ───────────────────────────────────────────────────────────

describe("GetDarkerColor", () => {
  it("subtracts the default offset (55) from each channel", () => {
    // #ff8237 → r:255-55=200(0xc8), g:130-55=75(0x4b), b:55-55=0(0x00)
    expect(GetDarkerColor("#ff8237")).toBe("#c84b00");
  });

  it("uses a custom offset when provided", () => {
    expect(GetDarkerColor("#ff0000", 100)).toBe("#9b0000");
  });

  it("clamps channels to 0 when the offset exceeds the channel value", () => {
    expect(GetDarkerColor("#000000")).toBe("#000000");
  });

  it("clamps only the channels that underflow to 0", () => {
    expect(GetDarkerColor("#0033ff", 55)).toBe("#0000c8");
  });
});

// ─── GetChildrenLevelColors ───────────────────────────────────────────────────

describe("GetChildrenLevelColors", () => {
  it("returns an array with the correct number of colors (levelsLength)", () => {
    const result = GetChildrenLevelColors({
      sectionColorRGB: [128, 128, 128],
      colorRange: 50,
      levelsLength: 5,
    });
    expect(result).toHaveLength(5);
  });

  it("first color is computed from the min of the color range", () => {
    const result = GetChildrenLevelColors({
      sectionColorRGB: [100, 100, 100],
      colorRange: 50,
      levelsLength: 2,
    });
    expect(result[0]).toBe(RgbToHex({ rgbColor: [50, 50, 50] }));
  });

  it("returns identical colors for all levels when colorRange is 0", () => {
    const result = GetChildrenLevelColors({
      sectionColorRGB: [100, 100, 100],
      colorRange: 0,
      levelsLength: 3,
    });
    expect(new Set(result).size).toBe(1);
    expect(result[0]).toBe(RgbToHex({ rgbColor: [100, 100, 100] }));
  });

  it("clamps min channel to 0 when sectionColor minus colorRange is negative", () => {
    const result = GetChildrenLevelColors({
      sectionColorRGB: [10, 10, 10],
      colorRange: 50,
      levelsLength: 1,
    });
    expect(result[0]).toBe(RgbToHex({ rgbColor: [0, 0, 0] }));
  });

  it("clamps max channel to 255 when sectionColor plus colorRange exceeds 255", () => {
    const result = GetChildrenLevelColors({
      sectionColorRGB: [240, 240, 240],
      colorRange: 50,
      levelsLength: 2,
    });
    const lastColor = result[result.length - 1]!;
    const lastRgb = HexToRgb({ hexColor: lastColor });
    expect(lastRgb[0]).toBeLessThanOrEqual(255);
  });
});

// ─── InterpolateHexColors ─────────────────────────────────────────────────────

describe("InterpolateHexColors", () => {
  it("returns the base color when progress is 0", () => {
    expect(InterpolateHexColors("#000000", "#ffffff", 0)).toBe("#000000");
  });

  it("returns the target color when progress is 1", () => {
    expect(InterpolateHexColors("#000000", "#ffffff", 1)).toBe("#ffffff");
  });

  it("returns the midpoint color when progress is 0.5", () => {
    expect(InterpolateHexColors("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("clamps progress above 1 to 1 — returns target color", () => {
    expect(InterpolateHexColors("#000000", "#ffffff", 1.5)).toBe("#ffffff");
  });

  it("clamps progress below 0 to 0 — returns base color", () => {
    expect(InterpolateHexColors("#000000", "#ffffff", -0.5)).toBe("#000000");
  });

  it("rounds progress to the nearest step when step is provided", () => {
    expect(InterpolateHexColors("#000000", "#ffffff", 0.4, 0.5)).toBe(
      "#808080"
    );
  });
});

// ─── GetRandomColor ───────────────────────────────────────────────────────────

describe("GetRandomColor", () => {
  afterEach(() => void vi.restoreAllMocks());

  it("returns a string starting with '#'", () => {
    expect(GetRandomColor().startsWith("#")).toBe(true);
  });

  it("returns a 7-character string (# + 6 hex digits)", () => {
    expect(GetRandomColor()).toHaveLength(7);
  });

  it("returns '#000000' when Math.random always returns 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(GetRandomColor()).toBe("#000000");
  });

  it("returns '#FFFFFF' when Math.random returns a value selecting index 15", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9375);
    expect(GetRandomColor()).toBe("#FFFFFF");
  });
});

// ─── ComputeConicGradient ─────────────────────────────────────────────────────

describe("ComputeConicGradient", () => {
  it("returns a string starting with 'conic-gradient('", () => {
    expect(ComputeConicGradient(["#ff0000", "#0000ff"])).toMatch(
      /^conic-gradient\(/
    );
  });

  it("includes the offset in the opening 'from Xdeg' clause", () => {
    expect(ComputeConicGradient(["#ff0000"], 90)).toContain("from 90deg");
  });

  it("uses the default offset of 45 when none is provided", () => {
    expect(ComputeConicGradient(["#ff0000"])).toContain("from 45deg");
  });

  it("includes all input colors in the output", () => {
    const result = ComputeConicGradient(["#ff0000", "#00ff00", "#0000ff"]);
    expect(result).toContain("#ff0000");
    expect(result).toContain("#00ff00");
    expect(result).toContain("#0000ff");
  });

  it("appends the first color again at the end to close the gradient", () => {
    const result = ComputeConicGradient(["#ff0000", "#0000ff"]) as string;
    const occurrences = (result.match(/#ff0000/g) ?? []).length;
    expect(occurrences).toBe(2);
  });
});

// ─── ComputeLinearGradient ────────────────────────────────────────────────────

describe("ComputeLinearGradient", () => {
  it("returns a string starting with 'linear-gradient(0deg,'", () => {
    expect(ComputeLinearGradient([{ color: "#ff0000", value: 1 }])).toMatch(
      /^linear-gradient\(0deg,/
    );
  });

  it("includes all provided colors in the output", () => {
    const result = ComputeLinearGradient([
      { color: "#ff0000", value: 0.5 },
      { color: "#0000ff", value: 0.5 },
    ]);
    expect(result).toContain("#ff0000");
    expect(result).toContain("#0000ff");
  });

  it("first color starts at 0%", () => {
    const result = ComputeLinearGradient([
      { color: "#ff0000", value: 0.5 },
      { color: "#0000ff", value: 0.5 },
    ]);
    expect(result).toContain("#ff0000 0%");
  });

  it("last color ends at 100% when weights sum to 1", () => {
    const result = ComputeLinearGradient([
      { color: "#ff0000", value: 0.5 },
      { color: "#0000ff", value: 0.5 },
    ]);
    expect(result).toContain("#0000ff 100%");
  });
});

// ─── ComputeRawGradientColors ─────────────────────────────────────────────────

describe("ComputeRawGradientColors", () => {
  it("returns a plain string of color stops (no 'conic-gradient(' wrapper)", () => {
    const result = ComputeRawGradientColors({ colors: ["#ff0000", "#0000ff"] });
    expect(result).not.toMatch(/^conic-gradient/);
  });

  it("includes all input colors in the output", () => {
    const result = ComputeRawGradientColors({
      colors: ["#ff0000", "#00ff00", "#0000ff"],
    });
    expect(result).toContain("#ff0000");
    expect(result).toContain("#00ff00");
    expect(result).toContain("#0000ff");
  });

  it("appends the first color at the end to close the gradient", () => {
    const result = ComputeRawGradientColors({
      colors: ["#ff0000", "#0000ff"],
    }) as string;
    const occurrences = (result.match(/#ff0000/g) ?? []).length;
    expect(occurrences).toBe(2);
  });
});
