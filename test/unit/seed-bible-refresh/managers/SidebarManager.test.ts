import { createSidebar } from "@packages/seed-bible/seed-bible/managers/SidebarManager";

describe("createSidebar", () => {
  it("initializes with settings closed, sidebar expanded, and mobile closed", () => {
    const sidebar = createSidebar();

    expect(sidebar.isSettingsOpen.value).toBe(false);
    expect(sidebar.isSidebarCollapsed.value).toBe(false);
    expect(sidebar.isMobileOpen.value).toBe(false);
  });

  it("openSettings() opens settings and closes mobile sidebar", () => {
    const sidebar = createSidebar();
    sidebar.openSidebar();

    sidebar.openSettings();

    expect(sidebar.isSettingsOpen.value).toBe(true);
    expect(sidebar.isMobileOpen.value).toBe(false);
  });

  it("closeSettings() closes settings without changing mobile state", () => {
    const sidebar = createSidebar();
    sidebar.openSettings();
    sidebar.openSidebar();

    sidebar.closeSettings();

    expect(sidebar.isSettingsOpen.value).toBe(false);
    expect(sidebar.isMobileOpen.value).toBe(true);
  });

  it("toggleSidebarCollapsed() toggles collapsed state", () => {
    const sidebar = createSidebar();

    sidebar.toggleSidebarCollapsed();
    expect(sidebar.isSidebarCollapsed.value).toBe(true);

    sidebar.toggleSidebarCollapsed();
    expect(sidebar.isSidebarCollapsed.value).toBe(false);
  });

  it("openSidebar() and closeSidebar() control mobile open state", () => {
    const sidebar = createSidebar();

    sidebar.openSidebar();
    expect(sidebar.isMobileOpen.value).toBe(true);

    sidebar.closeSidebar();
    expect(sidebar.isMobileOpen.value).toBe(false);
  });

  it("keeps state isolated across sidebar instances", () => {
    const first = createSidebar();
    const second = createSidebar();

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
});
