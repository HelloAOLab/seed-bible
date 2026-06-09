import {
  createNavigationManager,
  type NavigationManager,
} from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { createSidebar } from "@packages/seed-bible/seed-bible/managers/SidebarManager";

describe("createSidebar", () => {
  let addBotListenerMock: jest.Mock;
  let navigationManager: NavigationManager;

  beforeEach(() => {
    navigationManager = createNavigationManager();

    addBotListenerMock = jest.fn();
    (
      globalThis as { configBot?: { tags: Record<string, unknown> } }
    ).configBot = {
      tags: {},
    };
    (globalThis as { os?: { addBotListener: jest.Mock } }).os = {
      addBotListener: addBotListenerMock,
    };
  });

  afterEach(() => {
    delete (globalThis as { configBot?: { tags: Record<string, unknown> } })
      .configBot;
    delete (globalThis as { os?: { addBotListener: jest.Mock } }).os;
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

  it("keeps state isolated across sidebar instances", () => {
    const first = createSidebar(navigationManager);
    const second = createSidebar(navigationManager);

    first.openSettings();
    first.toggleSidebarCollapsed();
    first.openSidebar();

    expect(first.isSettingsOpen.value).toBe(true);
    expect(first.isSidebarCollapsed.value).toBe(true);
    expect(first.isMobileOpen.value).toBe(true);

    expect(second.isSettingsOpen.value).toBe(false);
    expect(second.isSidebarCollapsed.value).toBe(false);
    expect(second.isMobileOpen.value).toBe(false);
  });

  // it("syncs configBot.tags.settingsView when requestedSettingsView changes", () => {
  //   const sidebar = createSidebar(navigationManager);

  //   expect(configBot.tags.settingsView).toBe(null);

  //   sidebar.openSettingsToView("toolbar");
  //   expect(configBot.tags.settingsView).toBe("toolbar");

  //   sidebar.closeSettings();
  //   expect(configBot.tags.settingsView).toBe(null);
  // });

  it("syncs requestedSettingsView when configBot.settingsView changes", async () => {
    const sidebar = createSidebar(navigationManager);
    const listener = addBotListenerMock.mock.calls[0]?.[2] as
      | ((that: unknown) => Promise<void>)
      | undefined;

    expect(listener).toBeDefined();
    if (!listener) {
      return;
    }

    // configBot.tags.settingsView = "extensions";
    await listener({ tags: ["settingsView"] });
    expect(sidebar.requestedSettingsView.value).toBe("extensions");

    // configBot.tags.settingsView = null;
    await listener({ tags: ["settingsView"] });
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
