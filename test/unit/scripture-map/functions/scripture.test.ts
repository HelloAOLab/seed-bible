import { getFirstNonSpaceChars } from "../../../../packages/scripture-map/functions/scripture";

describe("getFirstNonSpaceChars", () => {
  describe("default count (3)", () => {
    it("returns first 3 non-space characters from a plain string", () => {
      expect(getFirstNonSpaceChars("Genesis")).toBe("Gen");
    });

    it("skips leading spaces", () => {
      expect(getFirstNonSpaceChars("  Genesis")).toBe("Gen");
    });

    it("skips spaces between characters", () => {
      expect(getFirstNonSpaceChars("1 Samuel")).toBe("1Sa");
    });

    it("skips multiple consecutive spaces", () => {
      expect(getFirstNonSpaceChars("1   2   3")).toBe("123");
    });

    it("returns all characters when string has fewer than 3 non-space chars", () => {
      expect(getFirstNonSpaceChars("Ab")).toBe("Ab");
    });

    it("returns empty string for empty input", () => {
      expect(getFirstNonSpaceChars("")).toBe("");
    });

    it("returns empty string when input is all spaces", () => {
      expect(getFirstNonSpaceChars("   ")).toBe("");
    });

    it("returns first 3 characters of a string with no spaces", () => {
      expect(getFirstNonSpaceChars("Psalms")).toBe("Psa");
    });

    it("returns single character when input has only one non-space char", () => {
      expect(getFirstNonSpaceChars(" X ")).toBe("X");
    });
  });

  describe("custom count", () => {
    it("returns first N non-space characters when count is specified", () => {
      expect(getFirstNonSpaceChars("Revelation", 3)).toBe("Rev");
      expect(getFirstNonSpaceChars("Revelation", 5)).toBe("Revel");
    });

    it("count of 1 returns the first non-space character", () => {
      expect(getFirstNonSpaceChars("  Genesis", 1)).toBe("G");
    });

    it("count of 0 returns empty string", () => {
      expect(getFirstNonSpaceChars("Genesis", 0)).toBe("");
    });

    it("count larger than available non-space chars returns all non-space chars", () => {
      expect(getFirstNonSpaceChars("Hi", 10)).toBe("Hi");
    });

    it("handles spaces-in-middle strings with custom count", () => {
      expect(getFirstNonSpaceChars("1 Kings", 4)).toBe("1Kin");
    });
  });
});
