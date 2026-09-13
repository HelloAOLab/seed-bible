import {
  hexToHsv,
  hsvToHex,
  normalizeHex,
  parseHex,
  rgbToHex,
} from "@packages/seed-bible/seed-bible/components/ColorPicker/color";

describe("ColorPicker color helpers", () => {
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
