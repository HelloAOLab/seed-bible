import { availableLanguages } from "@packages/seed-bible/app/hooks/i18n";

describe("i18n", () => {
  describe("availableLanguages", () => {
    it("should be an array of language objects", () => {
      expect(Array.isArray(availableLanguages)).toBe(true);
      expect(availableLanguages.length).toBeGreaterThan(0);
    });

    it("should include English", () => {
      const english = availableLanguages.find((l) => l.code === "en");
      expect(english).toBeDefined();
      expect(english?.name).toBe("English");
      expect(english?.nativeName).toBe("English");
    });

    it("should include Arabic with RTL flag", () => {
      const arabic = availableLanguages.find((l) => l.code === "ar");
      expect(arabic).toBeDefined();
      expect(arabic?.name).toBe("Arabic");
      expect(arabic?.rtl).toBe(true);
    });

    it("should include Persian with RTL flag", () => {
      const persian = availableLanguages.find((l) => l.code === "fa");
      expect(persian).toBeDefined();
      expect(persian?.rtl).toBe(true);
    });

    it("should include Urdu with RTL flag", () => {
      const urdu = availableLanguages.find((l) => l.code === "ur");
      expect(urdu).toBeDefined();
      expect(urdu?.rtl).toBe(true);
    });

    it("should have unique language codes", () => {
      const codes = availableLanguages.map((l) => l.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it("every language should have code, name, and nativeName", () => {
      for (const lang of availableLanguages) {
        expect(lang.code).toBeDefined();
        expect(typeof lang.code).toBe("string");
        expect(lang.code.length).toBeGreaterThan(0);

        expect(lang.name).toBeDefined();
        expect(typeof lang.name).toBe("string");

        expect(lang.nativeName).toBeDefined();
        expect(typeof lang.nativeName).toBe("string");
      }
    });

    it("RTL languages should all be correctly marked", () => {
      const knownRTLCodes = ["ar", "fa", "ur", "ps", "ug"];
      for (const code of knownRTLCodes) {
        const lang = availableLanguages.find((l) => l.code === code);
        expect(lang?.rtl).toBe(true);
      }
    });

    it("LTR languages should not have rtl flag", () => {
      const knownLTRCodes = ["en", "fr", "es", "pt", "zh", "ja", "ko"];
      for (const code of knownLTRCodes) {
        const lang = availableLanguages.find((l) => l.code === code);
        expect(lang?.rtl).toBeUndefined();
      }
    });

    it("should support at least 20 languages", () => {
      expect(availableLanguages.length).toBeGreaterThanOrEqual(20);
    });
  });
});
