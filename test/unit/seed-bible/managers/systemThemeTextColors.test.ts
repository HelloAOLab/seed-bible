import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { SYSTEM_THEME_ID } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import { stubColorScheme } from "../testUtils/stubColorScheme";

describe("system theme and per-section text colors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears text colors when the device flips to dark while on the System theme", async () => {
    const emitChange = stubColorScheme(false);
    const state = await createTestSeedBibleState();
    state.theme.setTheme(SYSTEM_THEME_ID);
    state.settings.updateTextSection("verse", { color: "#101010" });
    expect(state.settings.settings.value.textConfig.verse.color).toBe(
      "#101010"
    );

    emitChange(true);

    expect(state.theme.basePresetTheme.value.id).toBe("dark");
    expect(state.settings.settings.value.textConfig.verse.color).toBe("");
  });

  it("keeps text colors when the device scheme changes but a preset is pinned", async () => {
    const emitChange = stubColorScheme(false);
    const state = await createTestSeedBibleState();
    state.theme.setTheme("light");
    state.settings.updateTextSection("verse", { color: "#101010" });

    emitChange(true);

    expect(state.theme.basePresetTheme.value.id).toBe("light");
    expect(state.settings.settings.value.textConfig.verse.color).toBe(
      "#101010"
    );
  });
});
