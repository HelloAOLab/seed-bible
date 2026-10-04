import { computed, signal } from "@preact/signals";
import type { NavigationManager } from "./NavigationManager";
import type { ChatsManager } from "./ChatsManager";

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
  | "extensions"
  | "customizations";

/**
 * Remembers whether the desktop sidebar rail is collapsed. Absent until the
 * user (or the new-user default) chooses — the signal itself stays expanded
 * until `hydrateStoredCollapsed` runs, so SSR and the first client render match.
 */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "sb-sidebar-collapsed";

function readStoredSidebarCollapsed(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
  if (stored === "true") {
    return true;
  }
  if (stored === "false") {
    return false;
  }
  return null;
}

function writeStoredSidebarCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    SIDEBAR_COLLAPSED_STORAGE_KEY,
    collapsed ? "true" : "false"
  );
}

export interface CreateSidebarOptions {
  chatsManager: ChatsManager;
  navigation: NavigationManager;
  onOpenChatPanel?: () => void;
}

export function createSidebar(options: CreateSidebarOptions) {
  const navigation = options.navigation;
  const initialView = navigation.currentUrl.value.searchParams.get(
    "settingsView"
  ) as RequestedSettingsView | null;
  const isSidebarCollapsed = signal(false);
  const isMobileOpen = signal(false);
  // True when the mobile tabs drawer was opened directly from the bottom
  // toolbar (rather than from the book selector).
  const tabsOpenedFromToolbar = signal(false);
  const requestedSettingsView = signal<RequestedSettingsView>(initialView);
  const isSettingsOpen = computed(() => requestedSettingsView.value !== null);

  const shouldFocusSearch = signal(false);

  // Floating reader panels (anchored above the reader toolbar) — separate
  // from the sidebar drawer. Only one can be open at a time so clicking
  // one closes the other.
  //
  // Two-way bound to the `?search=open` query param below so the mobile Back
  // button/gesture closes the panel: opening pushes a history entry, and
  // Back pops it, which clears the param and flips this signal to false.
  const isSearchPanelOpen = signal(
    navigation.currentUrl.value.searchParams.get("search") === "open"
  );
  const isChatPanelOpen = options.chatsManager.isOpen;

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

  /**
   * Sets the rail and remembers the choice. Viewport-driven collapses (the
   * compact-desktop band, mobile landscape) assign `isSidebarCollapsed`
   * directly so they don't overwrite this preference.
   */
  const setSidebarCollapsed = (collapsed: boolean) => {
    isSidebarCollapsed.value = collapsed;
    writeStoredSidebarCollapsed(collapsed);
  };

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed(!isSidebarCollapsed.value);
  };

  /**
   * Applies a saved rail preference. Returns false when nothing is stored so
   * the caller can fall back to the new-user default; the signal stays at its
   * SSR seed (expanded) in that case.
   */
  const hydrateStoredCollapsed = (): boolean => {
    const stored = readStoredSidebarCollapsed();
    if (stored === null) {
      return false;
    }
    isSidebarCollapsed.value = stored;
    return true;
  };

  const openSidebar = () => {
    console.log("Opening sidebar");
    isMobileOpen.value = true;
  };

  const closeSidebar = () => {
    console.log("Closing sidebar");
    isMobileOpen.value = false;
  };

  /**
   * True while the Customization Center's list is open in Settings. Its
   * editors now open in their own side pane (see `CustomizationEditPane`),
   * not in this settings view, but the list stays open behind them so
   * previewing a customization means clicking around and selecting verses
   * in the reader while the list is still showing — so both the scrim
   * (Tabs.tsx, which would otherwise block input to the reader) and
   * `collapseSidebarOverlay` below (which would close the view on that
   * same click) need to stand down while it is.
   */
  const isCustomizationViewOpen = computed(
    () => requestedSettingsView.value === "customizations"
  );

  /**
   * Dismisses the sidebar when it is shown as a floating overlay (the compact
   * desktop band, where an expanded sidebar floats over the reader). Closes any
   * open settings view and collapses the sidebar back to its rail. Wired to the
   * scrim rendered behind the overlay so clicking anywhere on the page outside
   * the sidebar collapses it again. The collapse is assigned directly, like
   * the other viewport-driven ones: this band is the only place the scrim
   * exists, so dismissing it must not overwrite a wide-desktop preference.
   *
   * No-ops while the Customization Center is open, so an accidental outside
   * click can't silently discard unsaved edits — every other way of leaving
   * Settings (the close button, breadcrumb back navigation) still works
   * normally.
   */
  const collapseSidebarOverlay = () => {
    if (isCustomizationViewOpen.value) {
      return;
    }
    requestedSettingsView.value = null;
    isMobileOpen.value = false;
    isSidebarCollapsed.value = true;
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
    search: {
      get value() {
        return isSearchPanelOpen.value ? "open" : null;
      },
      set value(newValue) {
        isSearchPanelOpen.value = newValue === "open";
      },
    },
  });

  return {
    isSettingsOpen,
    isSidebarCollapsed,
    isMobileOpen,
    tabsOpenedFromToolbar,
    requestedSettingsView,
    isCustomizationViewOpen,
    toggleSettings,
    openSettings,
    openSettingsToView,
    closeSettings,
    toggleSidebarCollapsed,
    setSidebarCollapsed,
    hydrateStoredCollapsed,
    openSidebar,
    closeSidebar,
    collapseSidebarOverlay,
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
