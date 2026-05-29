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
  | "display-and-theme-all-settings"
  | "toolbar"
  | "extensions";

export interface CreateSidebarOptions {
  onOpenChatPanel?: () => void;
}

export function createSidebar(options?: CreateSidebarOptions) {
  const initialView = configBot.tags.settingsView ?? null;
  const isSidebarCollapsed = signal(false);
  const isMobileOpen = signal(false);
  const requestedSettingsView = signal<RequestedSettingsView>(initialView);
  const isSettingsOpen = computed(() => requestedSettingsView.value !== null);

  const shouldFocusSearch = signal(false);

  // Floating reader panels (anchored above the reader toolbar) — separate
  // from the sidebar drawer. Only one can be open at a time so clicking
  // one closes the other.
  const isSearchPanelOpen = signal(false);
  const isChatPanelOpen = signal(false);

  const openSearchPanel = () => {
    isChatPanelOpen.value = false;
    isSearchPanelOpen.value = true;
    shouldFocusSearch.value = true;
  };

  const closeSearchPanel = () => {
    isSearchPanelOpen.value = false;
  };

  const toggleSearchPanel = () => {
    if (isSearchPanelOpen.value) {
      closeSearchPanel();
    } else {
      openSearchPanel();
    }
  };

  const openChatPanel = () => {
    options?.onOpenChatPanel?.();
    isSearchPanelOpen.value = false;
    isChatPanelOpen.value = true;
  };

  const closeChatPanel = () => {
    isChatPanelOpen.value = false;
  };

  const toggleChatPanel = () => {
    if (isChatPanelOpen.value) {
      closeChatPanel();
    } else {
      openChatPanel();
    }
  };

  // Existing tools call `openSearch()` expecting the search UI to surface.
  // We redirect to the new floating panel so the toolbar's Search button
  // opens it instead of the sidebar drawer.
  const openSearch = () => {
    openSearchPanel();
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

    configBot.tags.sidebar = isMobileOpen.value ? "open" : null;
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

    if (hasSettingsViewChange) {
      const newRequestedView = configBot.tags.settingsView ?? null;
      if (newRequestedView !== requestedSettingsView.value) {
        requestedSettingsView.value = newRequestedView;
      }
    }

    const hasSidebarChange = changedTags.includes("sidebar");
    if (hasSidebarChange) {
      const newIsMobileOpen = configBot.tags.sidebar === "open";
      if (newIsMobileOpen !== isMobileOpen.value) {
        isMobileOpen.value = newIsMobileOpen;
      }
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
    isSearchPanelOpen,
    openSearchPanel,
    closeSearchPanel,
    toggleSearchPanel,
    isChatPanelOpen,
    openChatPanel,
    closeChatPanel,
    toggleChatPanel,
  };
}
