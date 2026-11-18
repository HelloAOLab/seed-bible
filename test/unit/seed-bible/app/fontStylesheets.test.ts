import { describe, expect, it } from "vitest";
import {
  customFontStylesheet,
  familiesNeedingCustomFontStylesheet,
} from "@packages/seed-bible/seed-bible/app/fontStylesheets";
import {
  DARK_THEME,
  LIGHT_THEME,
  type BibleThemeVariables,
} from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import {
  buildCustomFontValue,
  CUSTOMIZATION_FONT_FIELDS,
  CUSTOMIZATION_FONT_PRESETS,
} from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";

function themeFontStacks(variables: BibleThemeVariables) {
  return CUSTOMIZATION_FONT_FIELDS.map((field) => variables[field.key]);
}

describe("familiesNeedingCustomFontStylesheet", () => {
  it("asks for nothing with the built-in themes' fonts", () => {
    // Their default font is `system-ui`, which no Google Fonts stylesheet
    // has; asking for it added a render-blocking request to every page.
    expect(
      familiesNeedingCustomFontStylesheet(
        themeFontStacks(LIGHT_THEME.variables)
      )
    ).toEqual([]);
    expect(
      familiesNeedingCustomFontStylesheet(themeFontStacks(DARK_THEME.variables))
    ).toEqual([]);
  });

  it("asks for nothing with any font preset", () => {
    expect(
      familiesNeedingCustomFontStylesheet(
        CUSTOMIZATION_FONT_PRESETS.map((preset) => preset.value)
      )
    ).toEqual([]);
  });

  it("asks for a typed Google Font once, however many fields use it", () => {
    const lobster = buildCustomFontValue("Lobster");
    const families = familiesNeedingCustomFontStylesheet([
      lobster,
      "Newsreader, serif",
      lobster,
      "'Fira Sans', sans-serif",
      undefined,
      "",
    ]);

    expect(families).toEqual(["Lobster", "Fira Sans"]);
    expect(customFontStylesheet(families)).toBe(
      "https://fonts.googleapis.com/css2?family=Lobster&family=Fira+Sans&display=swap"
    );
  });

  it("skips system font keywords whatever their case", () => {
    expect(
      familiesNeedingCustomFontStylesheet([
        "System-UI, sans-serif",
        "serif",
        "-apple-system, BlinkMacSystemFont, sans-serif",
        "inherit",
      ])
    ).toEqual([]);
  });
});
