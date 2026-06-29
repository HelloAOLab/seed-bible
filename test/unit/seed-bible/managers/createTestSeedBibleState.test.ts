import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";

describe("createTestSeedBibleState", () => {
  it("bootstraps a full SeedBibleStateManager", async () => {
    const state = await createTestSeedBibleState();

    expect(state.bibleData).toBeDefined();
    expect(state.config).toBeDefined();
    expect(state.theme).toBeDefined();
    expect(state.sidebar).toBeDefined();
    expect(state.tabs).toBeDefined();
    expect(state.panes).toBeDefined();
    expect(state.selector).toBeDefined();
    expect(state.tools).toBeDefined();
    expect(state.login).toBeDefined();
    expect(state.readingHistory).toBeDefined();
    expect(state.highlights).toBeDefined();
    expect(state.annotations).toBeDefined();
    expect(state.sessions).toBeDefined();
    expect(state.modals).toBeDefined();
    expect(state.search).toBeDefined();
    expect(state.extensions).toBeDefined();
    expect(state.app).toBeDefined();
  });

  it("waits for initial tab reading state loads", async () => {
    const state = await createTestSeedBibleState();

    expect(state.tabs.tabs.value.length).toBeGreaterThan(0);

    for (const tab of state.tabs.tabs.value) {
      expect(tab.readingState.loading.value).toBe(false);
    }
  });
});
