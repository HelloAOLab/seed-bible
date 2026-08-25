import { describe, it, expect } from "vitest";
import {
  ClampRGBColor,
  GetColorType,
  HexToRgb,
  RgbToHex,
  HexShortToLong,
  HexLongToShort,
  RGBStringToArray,
  ColorParser,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/functions/colors";
import type { RGB } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/commonTypes";

describe("domain.functions.colors.ClampRGBColor", () => {
  it("rounds floating numbers", () => {
    expect(ClampRGBColor([10.5, 20.8, 30.3])).toEqual([11, 21, 30]);
  });

  it("clamps below 0", () => {
    expect(ClampRGBColor([-10, 100, -Infinity])).toEqual([0, 100, 0]);
  });

  it("clamps above 255", () => {
    expect(ClampRGBColor([300, 150, Infinity])).toEqual([255, 150, 255]);
  });
});

describe("domain.functions.colors.HexToRgb", () => {
  it("defaults to black when incorrect input format", () => {
    expect(HexToRgb({ hexColor: "incorrect format!" })).toEqual([0, 0, 0]);
    expect(HexToRgb({ hexColor: "#G54927" })).toEqual([0, 0, 0]);
    expect(HexToRgb({ hexColor: "#F549270" })).toEqual([0, 0, 0]);
  });

  it("supports hex values with hash", () => {
    expect(HexToRgb({ hexColor: "#F54927" })).toEqual([245, 73, 39]);
  });

  it("supports hex values without hash", () => {
    expect(HexToRgb({ hexColor: "F54927" })).toEqual([245, 73, 39]);
  });

  it("supports lower cased hex values", () => {
    expect(HexToRgb({ hexColor: "#2d7a18" })).toEqual([45, 122, 24]);
  });

  it("supports short hex format", () => {
    expect(HexToRgb({ hexColor: "#ABC" })).toEqual([170, 187, 204]);
  });

  it("trims the value", () => {
    expect(HexToRgb({ hexColor: "   #521266   " })).toEqual([82, 18, 102]);
  });

  it("round trip with RgbToHex", () => {
    const color = "#267f5a";
    expect(RgbToHex({ rgbColor: HexToRgb({ hexColor: color }) })).toBe(color);
  });
});

describe("domain.functions.colors.RgbToHex", () => {
  it("converts rgb format to lower cased hex format", () => {
    expect(RgbToHex({ rgbColor: [39, 245, 159] })).toBe("#27f59f");
  });

  it("clamps rgb values", () => {
    expect(RgbToHex({ rgbColor: [-100, 300, 150] })).toBe("#00ff96");
  });

  it("round trip with HexToRgb", () => {
    const color = [118, 61, 217] as RGB;
    expect(HexToRgb({ hexColor: RgbToHex({ rgbColor: color }) })).toEqual(
      color
    );
  });
});

describe("domain.functions.colors.GetColorType", () => {
  it("identifies array RGB colors", () => {
    expect(GetColorType([10, 20, 30])).toBe("arrayRGB");
  });

  it("identifies rgb() and rgba() strings as stringRGB", () => {
    expect(GetColorType("rgb(255, 0, 0)")).toBe("stringRGB");
    expect(GetColorType("rgba(0, 0, 0, 0.5)")).toBe("stringRGB");
    expect(GetColorType("rgb (1, 2, 3)")).toBe("stringRGB");
    expect(GetColorType("   rgb(1,2,3)   ")).toBe("stringRGB");
  });

  it("identifies 6-digit hex as longHex, with or without hash", () => {
    expect(GetColorType("#ff0000")).toBe("longHex");
    expect(GetColorType("ff0000")).toBe("longHex");
    expect(GetColorType("#2D7A18")).toBe("longHex");
    expect(GetColorType("   #521266   ")).toBe("longHex");
  });

  it("identifies 3-digit hex as shortHex, with or without hash", () => {
    expect(GetColorType("#abc")).toBe("shortHex");
    expect(GetColorType("abc")).toBe("shortHex");
  });

  it("returns false for unrecognized formats", () => {
    expect(GetColorType("hello")).toBe(false);
    expect(GetColorType("#12")).toBe(false);
    expect(GetColorType("#1234567")).toBe(false);
    expect(GetColorType("#gg0000")).toBe(false);
    expect(GetColorType("")).toBe(false);
  });

  it("is case-sensitive for the rgb prefix", () => {
    expect(GetColorType("RGB(255, 0, 0)")).toBe(false);
  });
});

describe("domain.functions.colors.HexShortToLong", () => {
  it("converts short hex color format to long, with or without hash", () => {
    expect(HexShortToLong("#abc")).toBe("#aabbcc");
    expect(HexShortToLong("123")).toBe("#112233");
    expect(HexShortToLong("  #fbb   ")).toBe("#ffbbbb");
    expect(HexShortToLong("  #6  c   8   ")).toBe("#66cc88");
  });

  it("lower-cases the result", () => {
    expect(HexShortToLong("#A38")).toBe("#aa3388");
    expect(HexShortToLong("#FFF")).toBe("#ffffff");
  });

  it("returns the same value for wrong formats", () => {
    expect(HexShortToLong("Test")).toBe("Test");
    expect(HexShortToLong("#g00")).toBe("#g00");
    expect(HexShortToLong("1234")).toBe("1234");
  });
});

describe("domain.functions.colors.HexLongToShort", () => {
  it("converts long hex color format to short, with or without hash", () => {
    expect(HexLongToShort("#aabbcc")).toBe("#abc");
    expect(HexLongToShort("112233")).toBe("#123");
    expect(HexLongToShort("  #227711   ")).toBe("#271");
    expect(HexLongToShort("  #66  c  c8 8   ")).toBe("#6c8");
  });

  it("lower-cases the result", () => {
    expect(HexLongToShort("#Aa55Aa")).toBe("#a5a");
    expect(HexLongToShort("#FfAA00")).toBe("#fa0");
  });

  it("returns the same value for wrong formats", () => {
    expect(HexLongToShort("Test")).toBe("Test");
    expect(HexLongToShort("#gg0000")).toBe("#gg0000");
    expect(HexLongToShort("#AA11222")).toBe("#AA11222");
  });

  it("only accepts same value pairs", () => {
    expect(HexLongToShort("#ab1122")).toBe("#ab1122");
  });
});

describe("domain.functions.colors.RGBStringToArray", () => {
  it("converts rgb string to array", () => {
    expect(RGBStringToArray("rgb(224, 169, 110)")).toEqual([224, 169, 110]);
    expect(RGBStringToArray("rgb(112, 110, 224)")).toEqual([112, 110, 224]);
    expect(RGBStringToArray("  rg b(15 4, 2  24, 11 0   )   ")).toEqual([
      154, 224, 110,
    ]);
  });

  it("clamps the values", () => {
    expect(RGBStringToArray("rgb(1000, 100, 260)")).toEqual([255, 100, 255]);
  });

  it("does not allow negative numbers", () => {
    expect(RGBStringToArray("rgb(-10, 100, 100)")).toEqual([0, 0, 0]);
  });

  it("defaults to black at wrong formats", () => {
    const rgbBlack = [0, 0, 0];
    expect(RGBStringToArray("Test")).toEqual(rgbBlack);
    expect(RGBStringToArray("rg(224, 169, 110)")).toEqual(rgbBlack);
    expect(RGBStringToArray("rgb(10, 200)")).toEqual(rgbBlack);
    expect(RGBStringToArray("54, 10, 10")).toEqual(rgbBlack);
    expect(RGBStringToArray("rgb(a, 0, 0)")).toEqual(rgbBlack);
  });
});

describe("domain.functions.colors.ColorParser", () => {
  it("converts current format to target", () => {
    expect(ColorParser("#00ff96", "arrayRGB")).toEqual([0, 255, 150]);
    expect(ColorParser("00ff96", "stringRGB")).toBe("rgba(0, 255, 150, 1)");
    expect(ColorParser("#00 ff99", "shortHex")).toBe("#0f9");

    expect(ColorParser("49d", "longHex")).toBe("#4499dd");
    expect(ColorParser("#4 9 d   ", "arrayRGB")).toEqual([68, 153, 221]);
    expect(ColorParser("#49d", "stringRGB")).toBe("rgba(68, 153, 221, 1)");

    expect(ColorParser("rgb(221, 147, 68)", "longHex")).toBe("#dd9344");
    expect(ColorParser("rgb(100, 500, 260)", "arrayRGB")).toEqual([
      100, 255, 255,
    ]);
    expect(ColorParser("rgb(221, 153, 68)", "shortHex")).toBe("#d94");

    expect(ColorParser([221, 68, 117], "stringRGB")).toBe(
      "rgba(221, 68, 117, 1)"
    );
    expect(ColorParser([200, -Infinity, Infinity], "longHex")).toBe("#c800ff");
    expect(ColorParser([221, 68, 119], "shortHex")).toBe("#d47");
  });

  it("returns input on wrong format", () => {
    expect(ColorParser("Test", "arrayRGB")).toBe("Test");
    expect(ColorParser("#gg0000", "arrayRGB")).toBe("#gg0000");
    expect(ColorParser("  r gb(22  1, 147, 6 8)  ", "arrayRGB")).toBe(
      "  r gb(22  1, 147, 6 8)  "
    );
  });

  it("falls back to long form when the color can't be condensed to shortHex", () => {
    expect(ColorParser("#00ff96", "shortHex")).toBe("#00ff96");
  });

  it("returns input if target format is the same as the current", () => {
    expect(ColorParser("#00ff96", "longHex")).toBe("#00ff96");
    expect(ColorParser("#49d", "shortHex")).toBe("#49d");
    expect(ColorParser("rgb(221, 147, 68)", "stringRGB")).toBe(
      "rgb(221, 147, 68)"
    );
    expect(ColorParser([221, 68, 117], "arrayRGB")).toEqual([221, 68, 117]);
  });
});
