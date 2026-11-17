import {
  hexToHsv,
  hsvToHex,
  normalizeHex,
  parseHex,
  relativeLuminance,
  rgbToHex,
} from "@packages/seed-bible/seed-bible/components/ColorPicker/color";

describe("ColorPicker color helpers", () => {
  describe("relativeLuminance", () => {
    it("runs from 0 for black to 1 for white", () => {
      expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
      expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 6);
    });

    it("weights green most and blue least, as the eye does", () => {
      expect(relativeLuminance({ r: 0, g: 255, b: 0 })).toBeCloseTo(0.7152, 4);
      expect(relativeLuminance({ r: 255, g: 0, b: 0 })).toBeCloseTo(0.2126, 4);
      expect(relativeLuminance({ r: 0, g: 0, b: 255 })).toBeCloseTo(0.0722, 4);
    });

    it("is about 0.216 for mid-gray, not 0.5", () => {
      expect(relativeLuminance({ r: 128, g: 128, b: 128 })).toBeCloseTo(
        0.2159,
        3
      );
    });
  });

  describe("parseHex", () => {
    it("accepts #RRGGBB and #RGB, with or without a leading #", () => {
      expect(parseHex("#ff0000")).toBe("#ff0000");
      expect(parseHex("00ff00")).toBe("#00ff00");
      expect(parseHex("#0f0")).toBe("#00ff00");
      expect(parseHex("ABC")).toBe("#aabbcc");
    });

    it("rejects non-hex strings", () => {
      expect(parseHex("")).toBeNull();
      expect(parseHex("red")).toBeNull();
      expect(parseHex("#ffff")).toBeNull();
      expect(parseHex("var(--sb-font-color)")).toBeNull();
    });
  });

  describe("normalizeHex", () => {
    it("falls back to black when the value is not hex", () => {
      expect(normalizeHex(undefined)).toBe("#000000");
      expect(normalizeHex("inherit")).toBe("#000000");
      expect(normalizeHex("#fff")).toBe("#ffffff");
    });
  });

  describe("hsv round-trip", () => {
    it("survives hex → hsv → hex for saturated colors", () => {
      for (const hex of [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffeb3a",
        "#112233",
      ]) {
        expect(hsvToHex(hexToHsv(hex))).toBe(hex);
      }
    });

    it("keeps the previous hue when converting a gray", () => {
      const gray = hexToHsv("#808080", 40);
      expect(gray.s).toBeCloseTo(0, 5);
      expect(gray.h).toBe(40);
    });
  });

  describe("rgbToHex", () => {
    it("clamps and rounds channel values", () => {
      expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
      expect(rgbToHex(300, -4, 16.4)).toBe("#ff0010");
    });
  });
});
