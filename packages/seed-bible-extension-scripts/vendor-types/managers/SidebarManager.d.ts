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
  | "extensions";
export interface CreateSidebarOptions {
  chatsManager: ChatsManager;
  navigation: NavigationManager;
  onOpenChatPanel?: () => void;
}
export declare function createSidebar(options: CreateSidebarOptions): {
  isSettingsOpen: import("@preact/signals").ReadonlySignal<boolean>;
  isSidebarCollapsed: import("@preact/signals").Signal<boolean>;
  isMobileOpen: import("@preact/signals").Signal<boolean>;
  tabsOpenedFromToolbar: import("@preact/signals").Signal<boolean>;
  requestedSettingsView: import("@preact/signals").Signal<RequestedSettingsView>;
  toggleSettings: () => void;
  openSettings: () => void;
  openSettingsToView: (view: RequestedSettingsView) => void;
  closeSettings: () => void;
  toggleSidebarCollapsed: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  collapseSidebarOverlay: () => void;
  openSearch: () => void;
  shouldFocusSearch: import("@preact/signals").Signal<boolean>;
  isSearchPanelOpen: import("@preact/signals").Signal<boolean>;
  openSearchPanel: () => void;
  closeSearchPanel: () => void;
  toggleSearchPanel: () => void;
  isChatPanelOpen: import("@preact/signals").Signal<boolean>;
  openChatPanel: () => void;
  closeChatPanel: () => void;
  toggleChatPanel: () => void;
};
