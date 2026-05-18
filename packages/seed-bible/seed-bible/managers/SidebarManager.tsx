import { computed, signal } from "@preact/signals";
import type { NavigationManager } from "./NavigationManager";

/**
 * Which settings subpage the SettingsPage should jump to on its next mount.
 * Used by the sidebar avatar button to deep-link into Account settings
 * without exporting the internal `SettingsView` type across packages.
 */
export type RequestedSettingsView =
  | null
  | "main"
  | "account"
  | "display-and-theme"
  | "all-settings"
  | "toolbar"
  | "extensions";

export function createSidebar(navigation: NavigationManager) {
  // TODO: Set the intitial view based on the URL
  const initialView = null;
  const isSidebarCollapsed = signal(false);
  const isMobileOpen = signal(false);
  const requestedSettingsView = signal<RequestedSettingsView>(initialView);
  const isSettingsOpen = computed(() => requestedSettingsView.value !== null);

  const shouldFocusSearch = signal(false);

  const openSearch = () => {
    openSidebar();
    shouldFocusSearch.value = true;
  };

  const openSettings = () => {
    requestedSettingsView.value = "main";
  };

  const toggleSettings = () => {
    if (isSettingsOpen.value) {
      requestedSettingsView.value = null;
    } else {
      requestedSettingsView.value = "main";
    }
  };

  /** Opens the settings sidebar jumping straight to a specific subpage. */
  const openSettingsToView = (view: RequestedSettingsView) => {
    requestedSettingsView.value = view;
  };

  const closeSettings = () => {
    requestedSettingsView.value = null;
    // On mobile the sidebar is a full-screen drawer, so closing settings
    // should dismiss the drawer entirely instead of falling back to the
    // tabs view. On desktop `isMobileOpen` is already false, so this is
    // a no-op.
    isMobileOpen.value = false;
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

  navigation.syncSignalsToUrl({
    settingsView: requestedSettingsView,
    sidebar: {
      get value() {
        return isMobileOpen.value ? "open" : null;
      },
      set value(newValue) {
        isMobileOpen.value = newValue === "open";
      },
    },
  });

  return {
    isSettingsOpen,
    isSidebarCollapsed,
    isMobileOpen,
    requestedSettingsView,
    toggleSettings,
    openSettings,
    openSettingsToView,
    closeSettings,
    toggleSidebarCollapsed,
    openSidebar,
    closeSidebar,
    openSearch,
    shouldFocusSearch,
  };
}
