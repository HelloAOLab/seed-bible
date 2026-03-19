import { signal } from "@preact/signals";

export function createSidebar() {
  const isSettingsOpen = signal(false);
  const isSidebarCollapsed = signal(false);
  const isMobileOpen = signal(false);

  const openSettings = () => {
    isSettingsOpen.value = true;
    isMobileOpen.value = false;
  };

  const closeSettings = () => {
    isSettingsOpen.value = false;
  };

  const toggleSidebarCollapsed = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value;
  };

  const openSidebar = () => {
    isMobileOpen.value = true;
  };

  const closeSidebar = () => {
    isMobileOpen.value = false;
  };

  return {
    isSettingsOpen,
    isSidebarCollapsed,
    isMobileOpen,
    openSettings,
    closeSettings,
    toggleSidebarCollapsed,
    openSidebar,
    closeSidebar,
  };
}
