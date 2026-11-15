import { visualAnonymousLabel } from "@packages/seed-bible/seed-bible/managers/Utils";
import {
  mockTranslate,
  mockI18nTranslations,
  resetMockI18n,
} from "../testUtils/mockI18n";

describe("visualAnonymousLabel", () => {
  afterEach(() => {
    resetMockI18n();
  });

  it("builds Color + Icon (Anonymous) from English defaults", () => {
    expect(
      visualAnonymousLabel(
        { colorName: "red", defaultIcon: "nature" },
        mockTranslate
      )
    ).toBe("Red Tree (Anonymous)");
  });

  it("uses locale translations when present", () => {
    mockI18nTranslations["color-red"] = "Rojo";
    mockI18nTranslations["animal-nature"] = "Árbol";
    mockI18nTranslations["visual-color-animal-anonymous"] =
      "{{color}} {{animal}} (Anónimo)";

    expect(
      visualAnonymousLabel(
        { colorName: "red", defaultIcon: "nature" },
        mockTranslate
      )
    ).toBe("Rojo Árbol (Anónimo)");
  });

  it("maps each known animal icon to its English label", () => {
    expect(
      visualAnonymousLabel(
        { colorName: "emerald", defaultIcon: "forest" },
        mockTranslate
      )
    ).toBe("Emerald Forest (Anonymous)");
    expect(
      visualAnonymousLabel(
        { colorName: "pink", defaultIcon: "cruelty_free" },
        mockTranslate
      )
    ).toBe("Pink Rabbit (Anonymous)");
    expect(
      visualAnonymousLabel(
        { colorName: "amber", defaultIcon: "local_florist" },
        mockTranslate
      )
    ).toBe("Amber Flower (Anonymous)");
  });
});
