import { computed, effect, signal } from "@preact/signals";

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

export function createSidebar() {
  const initialView = configBot.tags.settingsView ?? null;
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

  effect(() => {
    const requestedView = requestedSettingsView.value;

    if (configBot.tags.settingsView !== requestedView) {
      configBot.tags.settingsView = requestedView;
    }
  });

  os.addBotListener(configBot, "onBotChanged", async (that: unknown) => {
    const changedTagsSource =
      that && typeof that === "object" && "tags" in that
        ? (that as { tags?: unknown }).tags
        : null;
    const changedTags = Array.isArray(changedTagsSource)
      ? changedTagsSource
      : [];
    const hasSettingsViewChange = changedTags.includes("settingsView");

    if (!hasSettingsViewChange) {
      return;
    }

    const newRequestedView = configBot.tags.settingsView ?? null;
    if (newRequestedView !== requestedSettingsView.value) {
      requestedSettingsView.value = newRequestedView;
    }
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
