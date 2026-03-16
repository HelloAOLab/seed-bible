import { signal } from "@preact/signals";

const isSettingsOpen = signal(false);
const isSidebarCollapsed = signal(false);

export function useSidebar() {
  const openSettings = () => {
    isSettingsOpen.value = true;
  };

  const closeSettings = () => {
    isSettingsOpen.value = false;
  };

  const toggleSidebarCollapsed = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value;
  };

  return {
    isSettingsOpen,
    isSidebarCollapsed,
    openSettings,
    closeSettings,
    toggleSidebarCollapsed,
  };
}
