import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { SYSTEM_THEME_ID } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import { stubColorScheme } from "../testUtils/stubColorScheme";

describe("theme changes and per-section text colors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("keeps text colors when the device flips while on the System theme", async () => {
    const emitChange = stubColorScheme(false);
    const state = await createTestSeedBibleState();
    state.theme.setTheme(SYSTEM_THEME_ID);
    state.settings.updateTextSection("verse", { color: "#101010" });

    emitChange(true);

    expect(state.theme.basePresetTheme.value.id).toBe("dark");
    expect(state.settings.settings.value.textConfig.verse.color).toBe(
      "#101010"
    );
  });

  it("clears text colors when the viewer picks a different theme", async () => {
    stubColorScheme(false);
    const state = await createTestSeedBibleState();
    state.settings.updateTextSection("verse", { color: "#101010" });

    state.theme.setTheme("dark");

    expect(state.settings.settings.value.textConfig.verse.color).toBe("");
  });

  it("keeps the saved text colors of a returning visitor whose theme resolves to dark", async () => {
    window.localStorage.setItem(
      "sb-profile-config-local",
      JSON.stringify({
        themeId: "dark",
        textConfig: {
          bookTitle: { color: "#aa0000" },
          heading: { color: "#aa0000" },
          verse: { color: "#aa0000" },
        },
      })
    );
    stubColorScheme(false);

    const state = await createTestSeedBibleState();

    expect(state.theme.basePresetTheme.value.id).toBe("dark");
    expect(state.settings.settings.value.textConfig.verse.color).toBe(
      "#aa0000"
    );
  });
});
