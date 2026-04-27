import { signal } from "@preact/signals";

/**
 * Which settings subpage the SettingsPage should jump to on its next mount.
 * Used by the sidebar avatar button to deep-link into Account settings
 * without exporting the internal `SettingsView` type across packages.
 */
export type RequestedSettingsView =
  | null
  | "account"
  | "theme"
  | "text"
  | "toolbar"
  | "extensions"
  | "display";

export function createSidebar() {
  const isSettingsOpen = signal(false);
  const isSidebarCollapsed = signal(false);
  const isMobileOpen = signal(false);
  const requestedSettingsView = signal<RequestedSettingsView>(null);

  const openSettings = () => {
    requestedSettingsView.value = null;
    isSettingsOpen.value = true;
  };

  /** Opens the settings sidebar jumping straight to a specific subpage. */
  const openSettingsToView = (view: RequestedSettingsView) => {
    requestedSettingsView.value = view;
    isSettingsOpen.value = true;
  };

  const closeSettings = () => {
    isSettingsOpen.value = false;
    requestedSettingsView.value = null;
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
    requestedSettingsView,
    openSettings,
    openSettingsToView,
    closeSettings,
    toggleSidebarCollapsed,
    openSidebar,
    closeSidebar,
  };
}
