import { DEFAULT_APP_CONFIG } from "@packages/seed-bible/seed-bible/app/appConfig";
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from "@packages/seed-bible/seed-bible/managers/SidebarManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";

describe("desktop sidebar collapse for new visitors", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", window.location.pathname);
  });

  it("starts collapsed, and remembers that, when a new visitor has no saved choice", async () => {
    const state = await createTestSeedBibleState({
      sidebarCollapsed: "unset",
    });

    expect(state.app.isMobile.value).toBe(false);
    expect(state.sidebar.isSidebarCollapsed.value).toBe(true);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe(
      "true"
    );
  });

  it("keeps a saved expanded choice even when the visitor has not seen the tour", async () => {
    const state = await createTestSeedBibleState({
      sidebarCollapsed: false,
    });

    expect(state.sidebar.isSidebarCollapsed.value).toBe(false);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe(
      "false"
    );
  });

  it("stays expanded for a visitor who already finished or opted out of the tour", async () => {
    window.localStorage.setItem("sb-tutorial-seen", "true");
    const seen = await createTestSeedBibleState({
      sidebarCollapsed: "unset",
    });
    expect(seen.sidebar.isSidebarCollapsed.value).toBe(false);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe(
      null
    );

    window.localStorage.clear();
    window.localStorage.setItem("sb-tutorial-opted-out", "true");
    const optedOut = await createTestSeedBibleState({
      sidebarCollapsed: "unset",
    });
    expect(optedOut.sidebar.isSidebarCollapsed.value).toBe(false);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe(
      null
    );
  });

  it("restores the choice on the next visit after the visitor expands the rail", async () => {
    const first = await createTestSeedBibleState({
      sidebarCollapsed: "unset",
    });
    expect(first.sidebar.isSidebarCollapsed.value).toBe(true);

    first.sidebar.toggleSidebarCollapsed();
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe(
      "false"
    );

    const second = await createTestSeedBibleState();
    expect(second.sidebar.isSidebarCollapsed.value).toBe(false);
  });

  it("does not collapse or record a choice on mobile", async () => {
    const state = await createTestSeedBibleState({
      sidebarCollapsed: "unset",
      config: { ...DEFAULT_APP_CONFIG, renderedAsMobile: true },
    });

    expect(state.app.isMobile.value).toBe(true);
    expect(state.sidebar.isSidebarCollapsed.value).toBe(false);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe(
      null
    );
  });

  it("opens the sidebar when the tour starts, and keeps Today from offering the tour until it closes", async () => {
    const state = await createTestSeedBibleState({
      sidebarCollapsed: "unset",
      todayOpen: true,
    });

    expect(state.today.isOpen.value).toBe(true);
    expect(state.sidebar.isSidebarCollapsed.value).toBe(true);
    expect(state.tutorial.promptVisible.value).toBe(false);

    state.tutorial.acceptPrompt();

    expect(state.tutorial.running.value).toBe(true);
    expect(state.today.isOpen.value).toBe(false);
    expect(state.sidebar.isSidebarCollapsed.value).toBe(false);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe(
      "false"
    );
  });
});
