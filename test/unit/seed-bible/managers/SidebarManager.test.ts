import {
  createNavigationManager,
  type NavigationManager,
} from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { createSidebar } from "@packages/seed-bible/seed-bible/managers/SidebarManager";
import { signal } from "@preact/signals";

function createChatsManagerMock() {
  return {
    isOpen: signal(false),
  } as any;
}

describe("createSidebar", () => {
  let navigation: NavigationManager;

  beforeEach(() => {
    navigation = createNavigationManager();
  });

  afterEach(() => {
    // Clear URL params written by syncSignalsToUrl so they don't leak into
    // the next test's sidebar instance.
    window.history.replaceState(null, "", window.location.pathname);
  });

  it("initializes with settings closed, sidebar expanded, and mobile closed", () => {
    const sidebar = createSidebar({
      navigation,
      chatsManager: createChatsManagerMock(),
    });

    expect(sidebar.isSettingsOpen.value).toBe(false);
    expect(sidebar.isSidebarCollapsed.value).toBe(false);
    expect(sidebar.isMobileOpen.value).toBe(false);
  });

  it("openSettings() opens settings without changing mobile sidebar state", () => {
    const sidebar = createSidebar({
      navigation,
      chatsManager: createChatsManagerMock(),
    });
    sidebar.openSidebar();

    expect(sidebar.isSettingsOpen.value).toBe(false);

    sidebar.openSettings();

    expect(sidebar.isSettingsOpen.value).toBe(true);
    expect(sidebar.isMobileOpen.value).toBe(true);
  });

  it("toggleSettings() toggles settings without changing mobile sidebar state", () => {
    const sidebar = createSidebar({
      navigation,
      chatsManager: createChatsManagerMock(),
    });
    sidebar.openSidebar();
    sidebar.requestedSettingsView.value = null;

    expect(sidebar.isSettingsOpen.value).toBe(false);

    sidebar.toggleSettings();

    expect(sidebar.isSettingsOpen.value).toBe(true);
    expect(sidebar.isMobileOpen.value).toBe(true);
  });

  it("toggleSettings() closes settings when already open", () => {
    const sidebar = createSidebar({
      navigation,
      chatsManager: createChatsManagerMock(),
    });
    sidebar.openSidebar();
    sidebar.openSettings();

    expect(sidebar.isSettingsOpen.value).toBe(true);
    expect(sidebar.isMobileOpen.value).toBe(true);

    sidebar.toggleSettings();

    expect(sidebar.isSettingsOpen.value).toBe(false);
    expect(sidebar.isMobileOpen.value).toBe(true);
  });

  it("closeSettings() closes settings and dismisses the mobile drawer", () => {
    const sidebar = createSidebar({
      navigation,
      chatsManager: createChatsManagerMock(),
    });
    sidebar.openSettings();
    sidebar.openSidebar();

    sidebar.closeSettings();

    expect(sidebar.isSettingsOpen.value).toBe(false);
    expect(sidebar.isMobileOpen.value).toBe(false);
  });

  it("toggleSidebarCollapsed() toggles collapsed state", () => {
    const sidebar = createSidebar({
      navigation,
      chatsManager: createChatsManagerMock(),
    });

    sidebar.toggleSidebarCollapsed();
    expect(sidebar.isSidebarCollapsed.value).toBe(true);

    sidebar.toggleSidebarCollapsed();
    expect(sidebar.isSidebarCollapsed.value).toBe(false);
  });

  it("openSidebar() and closeSidebar() control mobile open state", () => {
    const sidebar = createSidebar({
      navigation,
      chatsManager: createChatsManagerMock(),
    });

    sidebar.openSidebar();
    expect(sidebar.isMobileOpen.value).toBe(true);

    sidebar.closeSidebar();
    expect(sidebar.isMobileOpen.value).toBe(false);
  });

  it("shares URL-synced state across instances but keeps collapsed state isolated", () => {
    const first = createSidebar({
      navigation,
      chatsManager: createChatsManagerMock(),
    });
    const second = createSidebar({
      navigation,
      chatsManager: createChatsManagerMock(),
    });

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
  //   const sidebar = createSidebar({ navigation, chatsManager: createChatsManagerMock() });

  //   expect(configBot.tags.settingsView).toBe(null);

  //   sidebar.openSettingsToView("toolbar");
  //   expect(configBot.tags.settingsView).toBe("toolbar");

  //   sidebar.closeSettings();
  //   expect(configBot.tags.settingsView).toBe(null);
  // });

  it("syncs requestedSettingsView when the settingsView URL param changes", () => {
    const sidebar = createSidebar({
      navigation,
      chatsManager: createChatsManagerMock(),
    });

    navigation.push("?settingsView=extensions");
    expect(sidebar.requestedSettingsView.value).toBe("extensions");

    navigation.push(window.location.pathname);
    expect(sidebar.requestedSettingsView.value).toBe(null);
  });

  // it("syncs isMobileOpen when configBot.sidebar changes", async () => {
  //   const sidebar = createSidebar({ navigation, chatsManager: createChatsManagerMock() });
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
  //   const sidebar = createSidebar({ navigation, chatsManager: createChatsManagerMock() });

  //   expect(configBot.tags.sidebar).toBe(null);

  //   sidebar.openSidebar();
  //   expect(configBot.tags.sidebar).toBe("open");

  //   sidebar.closeSidebar();
  //   expect(configBot.tags.sidebar).toBe(null);
  // });

  it("openChatPanel() calls onOpenChatPanel callback", () => {
    const onOpenChatPanel = vi.fn();
    const sidebar = createSidebar({
      navigation,
      chatsManager: createChatsManagerMock(),
      onOpenChatPanel,
    });

    sidebar.openChatPanel();

    expect(onOpenChatPanel).toHaveBeenCalledTimes(1);
    expect(sidebar.isChatPanelOpen.value).toBe(true);
  });

  it("toggleChatPanel() calls onOpenChatPanel only when opening", () => {
    const onOpenChatPanel = vi.fn();
    const sidebar = createSidebar({
      navigation,
      chatsManager: createChatsManagerMock(),
      onOpenChatPanel,
    });

    sidebar.toggleChatPanel();
    sidebar.toggleChatPanel();

    expect(onOpenChatPanel).toHaveBeenCalledTimes(1);
    expect(sidebar.isChatPanelOpen.value).toBe(false);
  });
});
