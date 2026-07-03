import { applyTranslationRule } from "../../../../../packages/seed-bible-utils/domain/functions/string";

describe("applyTranslationRule", () => {
  describe("single variable", () => {
    it("replaces {name} with the provided value", () => {
      expect(applyTranslationRule("1 {name}", { name: "Psalms" })).toBe(
        "1 Psalms"
      );
    });

    it("replaces variable at the start of the rule", () => {
      expect(applyTranslationRule("{name} 1", { name: "Psalms" })).toBe(
        "Psalms 1"
      );
    });

    it("replaces variable that is the entire rule", () => {
      expect(applyTranslationRule("{name}", { name: "Genesis" })).toBe(
        "Genesis"
      );
    });
  });

  describe("multiple variables", () => {
    it("replaces multiple distinct variables", () => {
      expect(
        applyTranslationRule("{number} {name}", {
          number: "2",
          name: "Samuel",
        })
      ).toBe("2 Samuel");
    });

    it("replaces the same variable appearing multiple times", () => {
      expect(
        applyTranslationRule("{name} and {name}", { name: "Psalms" })
      ).toBe("Psalms and Psalms");
    });
  });

  describe("unresolved variables", () => {
    it("leaves unknown variables as-is when not in the variables map", () => {
      expect(applyTranslationRule("1 {unknown}", { name: "Psalms" })).toBe(
        "1 {unknown}"
      );
    });

    it("leaves known and unknown variables correctly when mixed", () => {
      expect(
        applyTranslationRule("{number} {name} {extra}", {
          number: "3",
          name: "John",
        })
      ).toBe("3 John {extra}");
    });
  });

  describe("no variables", () => {
    it("returns the rule unchanged when it contains no placeholders", () => {
      expect(applyTranslationRule("Psalms", {})).toBe("Psalms");
    });

    it("returns empty string for an empty rule", () => {
      expect(applyTranslationRule("", { name: "Psalms" })).toBe("");
    });
  });

  describe("psalm subset translation rules", () => {
    it('produces correct display name for "1 {name}" rule', () => {
      expect(applyTranslationRule("1 {name}", { name: "Psalms" })).toBe(
        "1 Psalms"
      );
    });

    it('produces correct display name for "5 {name}" rule', () => {
      expect(applyTranslationRule("5 {name}", { name: "Salmos" })).toBe(
        "5 Salmos"
      );
    });

    it("works with translated book names in any language", () => {
      expect(applyTranslationRule("3 {name}", { name: "Psaumes" })).toBe(
        "3 Psaumes"
      );
    });
  });
});
