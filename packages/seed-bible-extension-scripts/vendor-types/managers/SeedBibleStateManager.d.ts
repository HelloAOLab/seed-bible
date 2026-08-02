import type { BibleSelectorState } from "../managers/BibleSelectorManager";
import {
  type BibleDataManager,
  type VerseRef,
} from "../managers/BibleDataManager";
import type { OfflineTranslationStore } from "../managers/OfflineTranslationStore";
import type { ToolsManager } from "../managers/BibleToolsManager";
import type { Pane, PanesManager } from "../managers/PanesManager";
import type {
  TabSlot,
  TabSlotLayoutId,
  TabsLayoutManager,
} from "../managers/TabsLayoutManager";
import type { LoginManager } from "../managers/LoginManager";
import { createSidebar } from "../managers/SidebarManager";
import type { ReaderTab, TabsManager } from "../managers/TabsManager";
import type { ThemeManager } from "../managers/ThemeManager";
import { type ReadonlySignal } from "@preact/signals";
import { type ReadingHistoryManager } from "../managers/ReadingHistoryManager";
import { type ExtensionManager } from "../managers/ExtensionManager";
import { type HighlightsManager } from "../managers/HighlightsManager";
import { type BookmarksManager } from "../managers/BookmarksManager";
import { type ChatSession, type ChatsManager } from "./ChatsManager";
import {
  type BibleReadingSession,
  type SessionsManager,
} from "../managers/SessionsManager";
import { type AnnotationsManager } from "../managers/AnnotationsManager";
import { type ModalManager } from "../managers/ModalManager";
import { type SettingsManager } from "../managers/SettingsManager";
import { type InvitationsManager } from "../managers/InvitationsManager";
import { createSearchManager } from "../managers/SearchManager";
import { type NavigationManager } from "../managers/NavigationManager";
import { CasualOSManager } from "./OsManager";
import type { AppConfig } from "../app/appConfig";
import { type I18nManager } from "../i18n";
import { type OnboardingManager } from "../managers/OnboardingManager";
import { type TutorialManager } from "../managers/TutorialManager";
import { type ReadingPlansManager } from "../managers/ReadingPlansManager";
import { type DiscoverManager } from "../managers/DiscoverManager";
import { type BibleReadingExtensionManager } from "../managers/BibleReadingExtensionManager";
type SidebarManager = ReturnType<typeof createSidebar>;
type SearchManager = ReturnType<typeof createSearchManager>;
/**
 * App-wide mobile breakpoint, in pixels. Viewports at or below this width use
 * the mobile layout (drawer sidebar, mobile header, full-screen selector);
 * above it the docked desktop layout applies. This is the single source of
 * truth for the JS side — the matching `@media (max-width: 480px)` /
 * `(min-width: 481px)` rules in components/Tabs/Tabs.css must be kept in sync by hand.
 */
export declare const MOBILE_BREAKPOINT = 480;
/**
 * Upper bound of the "compact desktop" band. For viewports above
 * {@link MOBILE_BREAKPOINT} but at or below this width the screen is too narrow
 * to dock a 320px sidebar beside the reader, so an *expanded* sidebar floats
 * over the reader instead of splitting the layout row. Kept in sync with the
 * matching `@media (min-width: 481px) and (max-width: 768px)` rules in
 * components/Tabs/Tabs.css by hand.
 */
export declare const SIDEBAR_OVERLAY_MAX_WIDTH = 768;
/**
 * Derived app-level state and high-level actions used by UI components.
 *
 * These values are mostly computed from lower-level managers and represent
 * the currently active reading context and pane selection.
 */
export interface AppState {
  /** True when multi-slot tab layouts are enabled by config. */
  panelsEnabled: ReadonlySignal<boolean>;
  /** Currently selected reading tab, or null when no tab is available. */
  selectedTab: ReadonlySignal<ReaderTab | null>;
  /**
   * Effective tab slot list shown by the UI (single-slot fallback when panels
   * are disabled, and always a single slot on mobile).
   */
  effectiveSlots: ReadonlySignal<TabSlot[]>;
  /**
   * Effective tab slot layout the UI should render. Mirrors the tabs layout
   * manager's layout on desktop, but on mobile it is always coerced to
   * `single` (one reader fills the viewport) without mutating the manager's
   * stored layout.
   */
  effectiveSlotLayout: ReadonlySignal<TabSlotLayoutId>;
  /**
   * Effective custom-pane list shown by the UI — identical to
   * `panes.panes` on desktop, but on mobile every pane is remapped to
   * `"fullscreen"` placement for rendering only (the manager's stored
   * placement is left untouched).
   */
  effectivePanes: ReadonlySignal<Pane[]>;
  /** Current window inner width in pixels. Updated on resize. */
  viewportWidth: ReadonlySignal<number>;
  /** Current window inner height in pixels. Updated on resize. */
  viewportHeight: ReadonlySignal<number>;
  /** True when viewport width is at or below the mobile breakpoint (480px). */
  isMobile: ReadonlySignal<boolean>;
  /** True when on a phone-sized viewport held in landscape orientation. */
  isMobileLandscape: ReadonlySignal<boolean>;
  /**
   * True in the "compact desktop" band (just above the mobile breakpoint) where
   * an expanded sidebar floats over the reader as an overlay rather than
   * docking beside it.
   */
  isCompactDesktop: ReadonlySignal<boolean>;
  /**
   * Snapshot of the current chapter selection for analytics and integrations.
   * Null when there is no active tab/chapter.
   */
  currentReadingState: ReadonlySignal<{
    tab: ReaderTab;
    translationId: string | null;
    bookId: string | null;
    chapterNumber: number | null;
  } | null>;
  /** Selects a tab and synchronizes slot focus. */
  selectTab: (tabId: string) => void;
  /** Creates a new tab and selects it. */
  addTab: () => void;
  /** Opens an existing tab in a new tab slot. */
  openInNewSlot: (tabId: string) => void;
  /** Selects a tab slot and updates related UI state. */
  selectSlot: (slotId: string) => void;
  /** Selects a custom pane. */
  selectPane: (paneId: string) => void;
  /** Closes any pane filling the reader. */
  closeFullscreenPanes: () => void;
  /** Creates a shared reading session and opens it in a new tab. */
  createSharedSession: () => Promise<BibleReadingSession>;
  /** Joins an existing shared session and opens it in a new tab. */
  joinSharedSession: (id: string) => Promise<BibleReadingSession>;
  /**
   * The Canonical URL for the current page.
   * Doesn't include the origin, but does include the query params for the current chapter (e.g. `/?translation=abc&book=GEN&chapter=1`).
   */
  canonicalUrl: ReadonlySignal<string>;
  /** The title of the page. */
  title: ReadonlySignal<string>;
  /** The description of the page. */
  description: ReadonlySignal<string>;
  /** The social title of the page (used for Open Graph and other social media metadata). */
  socialTitle: ReadonlySignal<string>;
  /** The name of the site (used for Open Graph and other social media metadata). */
  siteName: ReadonlySignal<string>;
  /** The toast currently shown at the bottom of the screen, or null when none. */
  currentToast: ReadonlySignal<{
    id: number;
    message: string;
  } | null>;
  /**
   * Shows a toast message at the bottom of the screen for 3.5s.
   * Calling again replaces the current toast and restarts the timer
   * (only one toast is ever visible at a time, always the most recent).
   */
  toast: (message: string) => void;
  /** Opens a chat session. */
  openChat: (sharedChat: ChatSession) => void;
  /** Opens a verse reference. */
  openVerseReference: (ref: VerseRef) => Promise<void>;
  /** Whether the Discover panel is currently open. */
  isDiscoverOpen: ReadonlySignal<boolean>;
  /**
   * Toggles the Discover panel open/closed.
   */
  openDiscover: () => void;
  /** Closes the Discover panel. */
  closeDiscover: () => void;
}
/**
 * Root state container for Seed Bible.
 *
 * This object aggregates all domain managers plus app-level computed state so
 * components can consume one consistent source of truth.
 */
export interface SeedBibleState {
  os: CasualOSManager;
  /** Bible API and translation/chapter data orchestration. */
  bibleData: BibleDataManager;
  /** Theme manager plus derived CSS variables/classes for rendering. */
  theme: ThemeManager & {
    themeCssVariables: ReadonlySignal<string>;
    themeCssClasses: ReadonlySignal<string>;
  };
  /** Sidebar/settings visibility manager. */
  sidebar: SidebarManager;
  /** Reader tab lifecycle manager. */
  tabs: TabsManager;
  /** Tab slot layout manager — Bible reading content always lives here. */
  tabsLayout: TabsLayoutManager;
  /** Custom (non-tab) pane manager: fullscreen/side/floating panes. */
  panes: PanesManager;
  /** Bible selector state for book/chapter picking. */
  selector: BibleSelectorState;
  /** Dynamic tool registry used by reader panes/toolbars. */
  tools: ToolsManager;
  /** Authentication and user profile manager. */
  login: LoginManager;
  /** Reading history persistence and sync manager. */
  readingHistory: ReadingHistoryManager;
  /** Verse highlight manager. */
  highlights: HighlightsManager;
  /** Per-tab/location bookmarks manager. */
  bookmarks: BookmarksManager;
  /** Annotation manager for notes/metadata. */
  annotations: AnnotationsManager;
  /** Chat session manager for in-app chat state. */
  chats: ChatsManager;
  /** Shared reading sessions manager. */
  sessions: SessionsManager;
  /** Modal manager for app-wide dialog state and rendering. */
  modals: ModalManager;
  /** App-level settings: font size, layout, book orientation, UI size, selection UI, etc. */
  settings: SettingsManager;
  /** Incoming session invitations and invite-sending. */
  invitations: InvitationsManager;
  /** Search manager for Typesense-backed queries. */
  search: SearchManager;
  /** First-run onboarding flow (welcome + install-to-home-screen prompt). */
  onboarding: OnboardingManager;
  /** Guided coachmark tour of the main UI. */
  tutorial: TutorialManager;
  /** In-app URL/state navigation manager for same-document routing. */
  navigation: NavigationManager;
  /**
   * Internationalization manager: current language, translation function, etc.
   */
  i18n: I18nManager;
  /** Reading plans: authoring, progress, and calendar. */
  readingPlans: ReadingPlansManager;
  /** Discover manager for contextual content providers. */
  discover: DiscoverManager;
  /**
   * Registry of reading extensions that can be enabled per reading state to
   * enhance navigation, discovered content, and session-synced custom data.
   */
  readingExtensions: BibleReadingExtensionManager;
  /**
   * Playlist manager for creating, editing, and syncing user playlists.
   */
  playlists: PlaylistManager;
  /** Aggregated computed app state and top-level UI actions. */
  app: AppState;
  /** Extension loading and runtime manager. */
  extensions: ExtensionManager;
  /**
   * Feature flag manager for enabling/disabling features at runtime.
   */
  features: FeaturesManager;
  /** True when the Terms of Service modal is open. */
  isTermsOpen: ReadonlySignal<boolean>;
  /** Opens the Terms of Service modal (reflected in the URL as `?terms=open`). */
  openTerms: () => void;
  /** Closes the Terms of Service modal (clears `terms` from the URL). */
  closeTerms: () => void;
  /** True when the Privacy Policy modal is open. */
  isPrivacyOpen: ReadonlySignal<boolean>;
  /** Opens the Privacy Policy modal (reflected in the URL as `?privacy=open`). */
  openPrivacy: () => void;
  /** Closes the Privacy Policy modal (clears `privacy` from the URL). */
  closePrivacy: () => void;
  /** True when the Code of Conduct modal is open. */
  isCodeOfConductOpen: ReadonlySignal<boolean>;
  /** Opens the Code of Conduct modal (reflected in the URL as `?conduct=open`). */
  openCodeOfConduct: () => void;
  /** Closes the Code of Conduct modal (clears `conduct` from the URL). */
  closeCodeOfConduct: () => void;
}
import { type PlaylistManager } from "./PlaylistManager";
import { type FeaturesManager } from "./FeaturesManager";
/**
 * Creates and wires the full Seed Bible application state graph.
 *
 * Manager dependencies are initialized in order, then composed into derived
 * signals/actions that power the UI. The resulting state is also passed to
 * extension context setup.
 */
export interface CreateSeedBibleStateOptions {
  /** Deployment config (base path + asset host). */
  config?: AppConfig;
  /** Full initial URL — supplied during SSR where `window` is unavailable. */
  initialHref?: string;
  /**
   * Where translations downloaded for offline reading are stored. Defaults to
   * IndexedDB; tests pass an in-memory store, and null disables the feature.
   */
  offlineStore?: OfflineTranslationStore | null;
}
export declare function createSeedBibleState(
  options?: CreateSeedBibleStateOptions
): SeedBibleState;
export {};
