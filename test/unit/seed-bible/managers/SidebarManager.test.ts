import {
  createNavigationManager,
  type NavigationManager,
} from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { createSidebar } from "@packages/seed-bible/seed-bible/managers/SidebarManager";

describe("createSidebar", () => {
  let navigationManager: NavigationManager;

  beforeEach(() => {
    navigationManager = createNavigationManager();
  });

  afterEach(() => {
    // Clear URL params written by syncSignalsToUrl so they don't leak into
    // the next test's sidebar instance.
    window.history.replaceState(null, "", window.location.pathname);
  });

  it("initializes with settings closed, sidebar expanded, and mobile closed", () => {
    const sidebar = createSidebar(navigationManager);

    expect(sidebar.isSettingsOpen.value).toBe(false);
    expect(sidebar.isSidebarCollapsed.value).toBe(false);
    expect(sidebar.isMobileOpen.value).toBe(false);
  });

  it("openSettings() opens settings without changing mobile sidebar state", () => {
    const sidebar = createSidebar(navigationManager);
    sidebar.openSidebar();

    expect(sidebar.isSettingsOpen.value).toBe(false);

    sidebar.openSettings();

    expect(sidebar.isSettingsOpen.value).toBe(true);
    expect(sidebar.isMobileOpen.value).toBe(true);
  });

  it("toggleSettings() toggles settings without changing mobile sidebar state", () => {
    const sidebar = createSidebar(navigationManager);
    sidebar.openSidebar();
    sidebar.requestedSettingsView.value = null;

    expect(sidebar.isSettingsOpen.value).toBe(false);

    sidebar.toggleSettings();

    expect(sidebar.isSettingsOpen.value).toBe(true);
    expect(sidebar.isMobileOpen.value).toBe(true);
  });

  it("toggleSettings() closes settings when already open", () => {
    const sidebar = createSidebar(navigationManager);
    sidebar.openSidebar();
    sidebar.openSettings();

    expect(sidebar.isSettingsOpen.value).toBe(true);
    expect(sidebar.isMobileOpen.value).toBe(true);

    sidebar.toggleSettings();

    expect(sidebar.isSettingsOpen.value).toBe(false);
    expect(sidebar.isMobileOpen.value).toBe(true);
  });

  it("closeSettings() closes settings and dismisses the mobile drawer", () => {
    const sidebar = createSidebar(navigationManager);
    sidebar.openSettings();
    sidebar.openSidebar();

    sidebar.closeSettings();

    expect(sidebar.isSettingsOpen.value).toBe(false);
    expect(sidebar.isMobileOpen.value).toBe(false);
  });

  it("toggleSidebarCollapsed() toggles collapsed state", () => {
    const sidebar = createSidebar(navigationManager);

    sidebar.toggleSidebarCollapsed();
    expect(sidebar.isSidebarCollapsed.value).toBe(true);

    sidebar.toggleSidebarCollapsed();
    expect(sidebar.isSidebarCollapsed.value).toBe(false);
  });

  it("openSidebar() and closeSidebar() control mobile open state", () => {
    const sidebar = createSidebar(navigationManager);

    sidebar.openSidebar();
    expect(sidebar.isMobileOpen.value).toBe(true);

    sidebar.closeSidebar();
    expect(sidebar.isMobileOpen.value).toBe(false);
  });

  it("shares URL-synced state across instances but keeps collapsed state isolated", () => {
    const first = createSidebar(navigationManager);
    const second = createSidebar(navigationManager);

    first.openSettings();
    first.toggleSidebarCollapsed();
    first.openSidebar();

    expect(first.isSettingsOpen.value).toBe(true);
    expect(first.isSidebarCollapsed.value).toBe(true);
    expect(first.isMobileOpen.value).toBe(true);

    // settingsView and sidebar state are synced through the URL, so other
    // instances sharing the navigation manager pick them up; only the
    // collapsed state is per-instance.
    expect(second.isSettingsOpen.value).toBe(true);
    expect(second.isSidebarCollapsed.value).toBe(false);
    expect(second.isMobileOpen.value).toBe(true);
  });

  // it("syncs configBot.tags.settingsView when requestedSettingsView changes", () => {
  //   const sidebar = createSidebar(navigationManager);

  //   expect(configBot.tags.settingsView).toBe(null);

  //   sidebar.openSettingsToView("toolbar");
  //   expect(configBot.tags.settingsView).toBe("toolbar");

  //   sidebar.closeSettings();
  //   expect(configBot.tags.settingsView).toBe(null);
  // });

  it("syncs requestedSettingsView when the settingsView URL param changes", () => {
    const sidebar = createSidebar(navigationManager);

    navigationManager.push("?settingsView=extensions");
    expect(sidebar.requestedSettingsView.value).toBe("extensions");

    navigationManager.push(window.location.pathname);
    expect(sidebar.requestedSettingsView.value).toBe(null);
  });

  // it("syncs isMobileOpen when configBot.sidebar changes", async () => {
  //   const sidebar = createSidebar(navigationManager);
  //   const listener = addBotListenerMock.mock.calls[0]?.[2] as
  //     | ((that: unknown) => Promise<void>)
  //     | undefined;

  //   expect(listener).toBeDefined();
  //   if (!listener) {
  //     return;
  //   }

  //   configBot.tags.sidebar = "open";
  //   await listener({ tags: ["sidebar"] });
  //   expect(sidebar.isMobileOpen.value).toBe(true);

  //   configBot.tags.sidebar = null;
  //   await listener({ tags: ["sidebar"] });
  //   expect(sidebar.isMobileOpen.value).toBe(false);
  // });

  // it("syncs configBot.tags.sidebar when isMobileOpen changes", () => {
  //   const sidebar = createSidebar(navigationManager);

  //   expect(configBot.tags.sidebar).toBe(null);

  //   sidebar.openSidebar();
  //   expect(configBot.tags.sidebar).toBe("open");

  //   sidebar.closeSidebar();
  //   expect(configBot.tags.sidebar).toBe(null);
  // });
});
