import { describe, it, expect } from "vitest";
import {
  ClampRGBColor,
  HexToRgb,
  RgbToHex,
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
