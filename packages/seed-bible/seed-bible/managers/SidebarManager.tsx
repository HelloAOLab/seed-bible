import { computed, signal } from "@preact/signals";
import type { NavigationManager } from "./NavigationManager";
import type { ChatsManager } from "./ChatsManager";

/**
 * Which settings subpage the SettingsPage should jump to on its next mount.
 * Used to deep-link into a specific settings subpage without exporting the
 * internal `SettingsView` type across packages.
 */
export type RequestedSettingsView =
  | null
  | "main"
  | "display-and-theme"
  | "display-and-theme-all-settings"
  | "extensions";

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

/**
 * How recently the user must have expanded, collapsed or opened settings for
 * the sidebar's next width change to count as theirs.
 */
const USER_RESIZE_WINDOW_MS = 1000;

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

  // When the user last asked for the sidebar to expand or collapse. The
  // sidebar animates only those changes: the ones made for them (a saved
  // choice or the new-visitor default applied on load, a viewport band) snap,
  // or the page would open with the sidebar visibly closing.
  let lastUserResizeAt = 0;
  const rememberUserResize = () => {
    lastUserResizeAt = Date.now();
  };
  /** Whether a width change happening now was asked for by the user. */
  const isUserResize = () =>
    Date.now() - lastUserResizeAt < USER_RESIZE_WINDOW_MS;
  // True when the mobile tabs drawer was opened directly from the bottom
  // toolbar (rather than from the book selector).
  const tabsOpenedFromToolbar = signal(false);
  const requestedSettingsView = signal<RequestedSettingsView>(initialView);
  const isSettingsOpen = computed(() => requestedSettingsView.value !== null);

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
    rememberUserResize();
    requestedSettingsView.value = "main";
  };

  const toggleSettings = () => {
    rememberUserResize();
    if (isSettingsOpen.value) {
      requestedSettingsView.value = null;
    } else {
      requestedSettingsView.value = "main";
    }
  };

  /** Opens the settings sidebar jumping straight to a specific subpage. */
  const openSettingsToView = (view: RequestedSettingsView) => {
    rememberUserResize();
    requestedSettingsView.value = view;
  };

  const closeSettings = () => {
    rememberUserResize();
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
    rememberUserResize();
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
   * Dismisses the sidebar when it is shown as a floating overlay (the compact
   * desktop band, where an expanded sidebar floats over the reader). Closes any
   * open settings view and collapses the sidebar back to its rail. Wired to the
   * scrim rendered behind the overlay so clicking anywhere on the page outside
   * the sidebar collapses it again. The collapse is assigned directly, like
   * the other viewport-driven ones: this band is the only place the scrim
   * exists, so dismissing it must not overwrite a wide-desktop preference.
   */
  const collapseSidebarOverlay = () => {
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
    toggleSettings,
    openSettings,
    openSettingsToView,
    closeSettings,
    toggleSidebarCollapsed,
    setSidebarCollapsed,
    isUserResize,
    hydrateStoredCollapsed,
    openSidebar,
    closeSidebar,
    collapseSidebarOverlay,
    openSearch,
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
