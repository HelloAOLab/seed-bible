import { createBibleSelectorState } from "../managers/BibleSelectorManager";
import type { BibleSelectorState } from "../managers/BibleSelectorManager";
import {
  createBibleDataManager,
  type BibleDataManager,
  type BookId,
  type VerseRef,
} from "../managers/BibleDataManager";
import {
  bibleLanguageToUiLocale,
  uiLocaleForDefaultTranslation,
  type BibleReadingState,
} from "../managers/BibleReadingManager";
import {
  buildReadingPath,
  hasReadingUrlPosition,
  parseReadingPath,
} from "../managers/ReadingUrlPath";
import {
  META_DESCRIPTION_MAX_GRAPHEMES,
  buildChapterExcerpt,
  countGraphemes,
  truncateForMeta,
} from "../managers/ChapterText";
import type { OfflineTranslationStore } from "../managers/OfflineTranslationStore";
import { createBibleToolsManager } from "../managers/BibleToolsManager";
import type { ToolsManager } from "../managers/BibleToolsManager";
import {
  FreeUseBibleAPI,
  getDefaultAPIEndpoint,
  type TranslationBook,
} from "../managers/FreeUseBibleAPI";
import { createPanes } from "../managers/PanesManager";
import type { Pane, PanesManager } from "../managers/PanesManager";
import { createTabsLayout } from "../managers/TabsLayoutManager";
import type {
  TabSlot,
  TabSlotLayoutId,
  TabsLayoutManager,
} from "../managers/TabsLayoutManager";
import { createLoginManager } from "../managers/LoginManager";
import type { LoginManager } from "../managers/LoginManager";
import { createSidebar } from "../managers/SidebarManager";
import { createTabs } from "../managers/TabsManager";
import type { ReaderTab, TabsManager } from "../managers/TabsManager";
import {
  writeStoredTabsState,
  type PersistedTab,
} from "../managers/TabsPersistence";
import {
  generateThemeCssVariables,
  createTheme,
  generateThemeCssClasses,
} from "../managers/ThemeManager";
import type { ThemeManager } from "../managers/ThemeManager";
import {
  batch,
  computed,
  effect,
  signal,
  type ReadonlySignal,
} from "@preact/signals";
import {
  createReadingHistoryManager,
  type ReadingHistoryManager,
} from "../managers/ReadingHistoryManager";
import {
  createExtensionManager,
  setupExtensionContext,
  type ExtensionManager,
} from "../managers/ExtensionManager";
import {
  createHighlightsManager,
  type HighlightsManager,
} from "../managers/HighlightsManager";
import {
  createBookmarksManager,
  type BookmarksManager,
} from "../managers/BookmarksManager";
import {
  createChatsManager,
  type ChatSession,
  type ChatsManager,
} from "./ChatsManager";
import {
  createSessionsManager,
  isSessionHost,
  type BibleReadingSession,
  type SessionsManager,
  type SessionStartPosition,
} from "../managers/SessionsManager";
import {
  createAnnotationsManager,
  type AnnotationsManager,
} from "../managers/AnnotationsManager";
import {
  createModalManager,
  type ModalManager,
} from "../managers/ModalManager";
import {
  createSettings,
  type SettingsManager,
} from "../managers/SettingsManager";
import {
  createInvitationsManager,
  type InvitationsManager,
} from "../managers/InvitationsManager";
import { createSearchManager } from "../managers/SearchManager";
import {
  createNavigationManager,
  type NavigationManager,
} from "../managers/NavigationManager";
import { CasualOSManager } from "./OsManager";
import { type AppConfig } from "../app/appConfig";
import { createI18nManager, type I18nManager } from "../i18n";
import {
  createOnboardingManager,
  type OnboardingManager,
} from "../managers/OnboardingManager";
import {
  createTutorialManager,
  type TutorialManager,
} from "../managers/TutorialManager";
import { range } from "es-toolkit";
import {
  createReadingPlansManager,
  type ReadingPlansManager,
} from "../managers/ReadingPlansManager";
import {
  createDiscoverManager,
  type DiscoverManager,
} from "../managers/DiscoverManager";
import {
  createBibleReadingExtensionManager,
  type BibleReadingExtensionManager,
} from "../managers/BibleReadingExtensionManager";

type SidebarManager = ReturnType<typeof createSidebar>;
type SearchManager = ReturnType<typeof createSearchManager>;

/**
 * App-wide mobile breakpoint, in pixels. Viewports at or below this width use
 * the mobile layout (drawer sidebar, mobile header, full-screen selector);
 * above it the docked desktop layout applies. This is the single source of
 * truth for the JS side — the matching `@media (max-width: 480px)` /
 * `(min-width: 481px)` rules in components/Tabs/Tabs.css must be kept in sync by hand.
 */
export const MOBILE_BREAKPOINT = 480;

/**
 * Upper bound of the "compact desktop" band. For viewports above
 * {@link MOBILE_BREAKPOINT} but at or below this width the screen is too narrow
 * to dock a 320px sidebar beside the reader, so an *expanded* sidebar floats
 * over the reader instead of splitting the layout row. Kept in sync with the
 * matching `@media (min-width: 481px) and (max-width: 768px)` rules in
 * components/Tabs/Tabs.css by hand.
 */
export const SIDEBAR_OVERLAY_MAX_WIDTH = 768;

/**
 * Fallback `<meta name="description">` for pages with no chapter to quote —
 * the site root, and the three cases where a chapter never arrives (an upstream
 * failure, a book absent from the translation, or the SSR load timeout).
 */
const APP_META_DESCRIPTION =
  "Read, search, and study the Bible online. Free translations in many languages, with highlights, notes, bookmarks, and reading plans.";

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
  /**
   * Creates a shared reading session and opens it in a new tab, starting from
   * the active tab's translation, book and chapter.
   */
  createSharedSession: () => Promise<BibleReadingSession>;
  /** Joins an existing shared session and opens it in a new tab. */
  joinSharedSession: (id: string) => Promise<BibleReadingSession>;

  /**
   * The Canonical URL for the current page.
   * Origin-relative, and always the explicit four-segment reading path
   * (e.g. `/en/AAB/genesis/1`) — see the computed for why the language segment
   * is always spelled out and why it follows the translation.
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
  currentToast: ReadonlySignal<{ id: number; message: string } | null>;
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

// The extension set is auto-discovered from every extension package under
// `packages/` by the `vite-plugin-extensions` plugin. See
// script/lib/vite-plugin-extensions.ts.
import SEED_BIBLE_EXTENSIONS from "virtual:@extensions";
import { createPlaylistManager, type PlaylistManager } from "./PlaylistManager";
import { createFeaturesManager, type FeaturesManager } from "./FeaturesManager";
import {
  DiscoverPane,
  DiscoverPaneHeader,
  DiscoverPaneTitle,
} from "../components/DiscoverPane/DiscoverPane";

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

/** Where a shared session started from this reading surface should open. */
function getSessionStartPosition(
  readingState: BibleReadingState
): SessionStartPosition {
  return {
    initialTranslationId: readingState.translationId.value,
    initialBookId: readingState.bookId.value,
    initialChapterNumber: readingState.chapterNumber.value,
  };
}

export function createSeedBibleState(
  options: CreateSeedBibleStateOptions = {}
): SeedBibleState {
  console.log("Creating SeedBibleState with options:", options);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features = createFeaturesManager((globalThis as any).posthog ?? null);
  const navigation = createNavigationManager({
    initialHref: options.initialHref,
    basePath: options.config?.basePath,
  });
  const branding = options.config?.branding;
  const api = new FreeUseBibleAPI(
    getDefaultAPIEndpoint(navigation.currentUrl.value)
  );
  const i18n = createI18nManager(
    navigation,
    options.config?.acceptedLanguages ?? []
  );
  const data = createBibleDataManager(api, {
    offlineStore: options.offlineStore,
  });
  const os = CasualOSManager();
  const login = createLoginManager({ os });
  const highlights = createHighlightsManager(os, login);
  const bookmarks = createBookmarksManager(os, login);
  const settings = createSettings(os, login, navigation);
  // Persist a user's explicit language selection to their profile. Wiring it
  // through `requestLanguageChange` (rather than a blanket `languageChanged`
  // listener) keeps URL-driven language changes view-only.
  i18n.setLanguagePersister(settings.persistLanguage);
  const panelsEnabled = computed(() => !settings.settings.value.disablePanels);
  const themeManager = createTheme(settings);
  // Filled once tabs exist so local chat can resolve localized book names.
  const selectedTabTranslationBooks = signal<TranslationBook[] | undefined>(
    undefined
  );
  const chats = createChatsManager(login, i18n, selectedTabTranslationBooks);
  const sidebar = createSidebar({ navigation, chatsManager: chats });
  const discover = createDiscoverManager();
  const readingExtensions = createBibleReadingExtensionManager();
  const tabs = createTabs(
    navigation,
    data,
    highlights,
    chats,
    i18n,
    login,
    discover,
    readingExtensions
  );
  const tabsLayout = createTabsLayout(tabs, panelsEnabled);
  const selector = createBibleSelectorState(
    data,
    tabs,
    tabsLayout,
    settings,
    sidebar,
    bookmarks,
    navigation,
    login
  );
  const tools = createBibleToolsManager(branding);
  const readingHistory = createReadingHistoryManager(os, login);
  const annotations = createAnnotationsManager(os, login);
  const sessions = createSessionsManager(
    os,
    data,
    login,
    highlights,
    i18n,
    readingExtensions
  );
  const extensions = createExtensionManager(login, {
    defaultExtensions: SEED_BIBLE_EXTENSIONS,
  });
  const modals = createModalManager();
  const search = createSearchManager();

  // When the app is opened via a content link — a shared-session invite
  // (`?sessionId=...`) or a shared playlist (`?playlist=...`) — the user came to
  // view that content, not to onboard, so we skip the welcome screen and the
  // auto-starting tutorial for this visit. This is derived from the current URL
  // rather than persisted, so it only affects this tab/load: revisiting without
  // either param shows onboarding and tutorials as usual.
  const openedViaContentLink =
    typeof window !== "undefined" &&
    (!!navigation.currentUrl.value.searchParams.get("sessionId") ||
      !!navigation.currentUrl.value.searchParams.get("playlist"));

  const onboarding = createOnboardingManager(login);

  // Terms of Service modal. Two-way bound to the `?terms=open` query param so
  // it can be deep-linked: setting the param opens the modal, and closing the
  // modal clears the param. Anything other than `open` (or no param) is closed.
  const termsOpen = signal(
    navigation.currentUrl.value.searchParams.get("terms") === "open"
  );
  const isTermsOpen = computed(() => termsOpen.value);
  const openTerms = () => {
    termsOpen.value = true;
  };
  const closeTerms = () => {
    termsOpen.value = false;
  };
  // Privacy Policy modal. Two-way bound to the `?privacy=open` query param so
  // it can be deep-linked, mirroring the Terms of Service modal above.
  const privacyOpen = signal(
    navigation.currentUrl.value.searchParams.get("privacy") === "open"
  );
  const isPrivacyOpen = computed(() => privacyOpen.value);
  const openPrivacy = () => {
    privacyOpen.value = true;
  };
  const closePrivacy = () => {
    privacyOpen.value = false;
  };

  // Code of Conduct modal. Two-way bound to the `?conduct=open` query param so
  // it can be deep-linked, mirroring the modals above.
  const codeOfConductOpen = signal(
    navigation.currentUrl.value.searchParams.get("conduct") === "open"
  );
  const isCodeOfConductOpen = computed(() => codeOfConductOpen.value);
  const openCodeOfConduct = () => {
    codeOfConductOpen.value = true;
  };
  const closeCodeOfConduct = () => {
    codeOfConductOpen.value = false;
  };

  navigation.syncSignalsToUrl({
    terms: {
      get value() {
        return termsOpen.value ? "open" : null;
      },
      set value(newValue) {
        termsOpen.value = newValue === "open";
      },
    },
    privacy: {
      get value() {
        return privacyOpen.value ? "open" : null;
      },
      set value(newValue) {
        privacyOpen.value = newValue === "open";
      },
    },
    conduct: {
      get value() {
        return codeOfConductOpen.value ? "open" : null;
      },
      set value(newValue) {
        codeOfConductOpen.value = newValue === "open";
      },
    },
  });
  const readingPlans = createReadingPlansManager(os, login);

  const { currentTheme } = themeManager;
  const theme = computed(() => currentTheme.value);
  const themeCssVariables = computed(() =>
    generateThemeCssVariables(theme.value)
  );
  const themeCssClasses = computed(() => generateThemeCssClasses(theme.value));

  // Theme is the source of truth for text colors. When the user switches
  // theme presets, drop any per-section color override from the text editor
  // so verse / book title / heading pick up the new theme's colors.
  let prevPresetId = themeManager.selectedThemeId.peek();
  effect(() => {
    const id = themeManager.selectedThemeId.value;
    if (id === prevPresetId) return;
    prevPresetId = id;
    settings.resetTextColors();
  });
  const selectedTab = computed(
    () =>
      tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null
  );

  // Keep local-chat scripture parsing in sync with the open reading tab.
  effect(() => {
    selectedTabTranslationBooks.value =
      selectedTab.value?.readingState.translationBooks.value?.books;
  });

  const renderedAsMobile = options.config?.renderedAsMobile ?? false;
  const isSSR = import.meta.env.SSR as boolean;

  const viewportWidth = signal(
    typeof window === "undefined"
      ? isSSR && renderedAsMobile
        ? MOBILE_BREAKPOINT
        : 1000
      : window.innerWidth
  );
  const viewportHeight = signal(
    typeof window === "undefined"
      ? isSSR && renderedAsMobile
        ? 800
        : 1000
      : window.innerHeight
  );
  const isMobile = computed(() => viewportWidth.value <= MOBILE_BREAKPOINT);

  // Created after `isMobile` so panes can enforce a single fullscreen pane:
  // on mobile every pane is displayed fullscreen, so opening one closes the
  // rest.
  const panes = createPanes(isMobile);
  const playlists = createPlaylistManager(
    os,
    login,
    tabs,
    navigation,
    isMobile,
    modals,
    i18n,
    readingExtensions
  );
  // Close any fullscreen pane when the book/chapter in the URL path changes,
  // so navigating reveals the reader (every navigation path writes this
  // position into the path — see `commitSelectedTabToUrl` in TabsManager).
  // The first location only sets a baseline, so load-time init doesn't close a
  // pane auto-opened for the same load (e.g. Today via `?today=open`).
  //
  // `?verse` is deliberately NOT part of the location: TabsManager mirrors the
  // verse *selection* into that param, so counting it here made selecting (or
  // clearing) a verse look like a navigation — which closed the very pane the
  // user had just opened from the verse toolbar.
  //
  // The flip side is that this effect can't see a move *within* a chapter, so any
  // path that jumps to a verse and must reveal the reader has to call
  // `closeFullscreenPanes` itself rather than rely on this: verse reference links
  // (`handleOpenVerseReference` below), the floating panels' jump actions, and
  // sidebar search results (`SidebarSearch`) all do. Selecting a tab
  // (`handleSelectTab`) closes them too, which covers most of the remaining
  // paths incidentally.
  let lastReadingLocation: string | null = null;
  effect(() => {
    const url = navigation.currentUrl.value;
    const parsed = parseReadingPath(url.pathname, navigation.basePath);
    if (!parsed) {
      return;
    }

    const location = `${parsed.bookId ?? parsed.rawBookSegment}|${parsed.chapter}`;
    const previous = lastReadingLocation;
    lastReadingLocation = location;

    if (previous === null || previous === location) {
      return;
    }
    panes.closeFullscreenPanes();
  });

  // Whether Today will auto-open over the reader on this cold load — mirrors
  // the predicate in `today-screen`'s bootstrap (an explicit `?today` param
  // wins; otherwise it opens unless the boot URL already points somewhere
  // specific). Read from `initialUrl`, not the live `currentUrl`, for the same
  // reason today-screen does: TabsManager echoes the reader's book/chapter
  // into the live URL before extensions finish loading.
  const initialUrlParams = navigation.initialUrl.searchParams;
  const todayWillAutoOpen =
    initialUrlParams.get("today") !== null
      ? initialUrlParams.get("today") === "open"
      : !(
          hasReadingUrlPosition(navigation.initialUrl, navigation.basePath) ||
          initialUrlParams.has("sessionId")
        );

  // Latches true the first time Today's pane is observed open, so the
  // "about to be covered by Today" window (the gap between the chapter
  // loading and Today's pane actually opening) doesn't read as reader-visible.
  const todayHasOpened = signal(false);
  effect(() => {
    if (panes.panes.value.some((pane) => pane.id === "today-screen-pane")) {
      todayHasOpened.value = true;
    }
  });

  // The reader is visible when a chapter is loaded, no fullscreen pane covers
  // it (matching `isFullscreenPaneVisible` in BibleReaderToolbar — on mobile
  // any open pane covers the reader), and Today isn't about to auto-open over
  // it for this load.
  const readerVisible = computed<boolean>(() => {
    const chapterLoaded =
      selectedTab.value?.readingState.chapterData.value != null;
    if (!chapterLoaded) {
      return false;
    }
    const coveredByPane = panes.panes.value.some(
      (pane) => pane.placement === "fullscreen" || isMobile.value
    );
    if (coveredByPane) {
      return false;
    }
    if (todayWillAutoOpen && !todayHasOpened.value) {
      return false;
    }
    return true;
  });

  const tutorial = createTutorialManager(
    login,
    readerVisible,
    selector,
    isMobile,
    panes,
    sidebar,
    openedViaContentLink
  );

  // Once the tutorial has been resolved (seen, skipped, declined, or opted
  // out) and the reader is visible, offer the install prompt — to any
  // not-yet-installed user, logged in or not. Deferring past the tutorial
  // means the profile has had time to load, so there's no "stale prompt"
  // concern the way there was on startup. One-shot via `installOfferChecked`.
  let installOfferChecked = false;
  effect(() => {
    if (installOfferChecked) {
      return;
    }
    if (openedViaContentLink) {
      return;
    }
    if (login.userId.value && login.profile.value === null) {
      return;
    }
    if (!readerVisible.value) {
      return;
    }
    const tutorialResolved =
      !tutorial.promptVisible.value &&
      !tutorial.running.value &&
      (tutorial.completed.value || tutorial.optedOut.value);
    if (!tutorialResolved) {
      return;
    }
    installOfferChecked = true;
    if (onboarding.installAvailable.value) {
      onboarding.openInstall();
    }
  });

  // A phone held sideways: landscape orientation with the short viewport
  // height typical of phones. Tablets/desktops in landscape have more
  // vertical room and are excluded by the height cap.
  const isMobileLandscape = computed(
    () =>
      viewportHeight.value > 0 &&
      viewportHeight.value <= 600 &&
      viewportWidth.value > viewportHeight.value
  );

  effect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleResize = () => {
      batch(() => {
        viewportWidth.value = window.innerWidth;
        viewportHeight.value = window.innerHeight;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  // Auto-collapse the docked sidebar when entering mobile-landscape so the
  // reader gets the limited vertical space. Reacting only to the boolean
  // means this fires once per transition into landscape and still lets the
  // user manually re-expand afterwards.
  effect(() => {
    if (isMobileLandscape.value) {
      sidebar.isSidebarCollapsed.value = true;
    }
  });

  // The "compact desktop" band (just above the mobile breakpoint): an
  // expanded sidebar would overlay the reader rather than dock beside it
  // (see components/Tabs/Tabs.css), so start collapsed to a rail when entering the band.
  // Same once-per-transition pattern as the landscape collapse above, so the
  // user can still expand the floating sidebar afterwards.
  const isCompactDesktop = computed(
    () =>
      viewportWidth.value > MOBILE_BREAKPOINT &&
      viewportWidth.value <= SIDEBAR_OVERLAY_MAX_WIDTH
  );
  effect(() => {
    if (isCompactDesktop.value) {
      sidebar.isSidebarCollapsed.value = true;
    }
  });

  const effectiveSlots = computed(() => {
    if (!panelsEnabled.value) {
      // tabsLayout.setLayout already forces "single" whenever panelsEnabled
      // is false, but the manager's stored slots may still lag behind a
      // config change that happened without an explicit setLayout call, so
      // clamp here too. This is applied to the rendered view only — the
      // manager's own slots are left untouched so they are restored when
      // panels are re-enabled.
      const allSlots = tabsLayout.slots.value;
      const tab = selectedTab.value;
      const preferred =
        (tab ? allSlots.find((s) => s.tab?.id === tab.id) : null) ??
        allSlots[0] ??
        null;
      return preferred ? [preferred] : [];
    }
    if (isMobile.value) {
      // Mobile shows exactly one slot at a time — never stacked — so a single
      // reader fills the small viewport. This is applied to the rendered view
      // only: the tabs layout manager's own settings (layout, extra slots) are
      // left untouched so they are restored when the viewport grows back to a
      // desktop size. We keep the slot hosting the currently selected tab
      // (falling back to the manager's selected slot, then the first slot).
      const allSlots = tabsLayout.slots.value;
      if (allSlots.length === 0) {
        return [];
      }

      const tab = selectedTab.value;
      const selectedSlotId = tabsLayout.selectedSlotId.value;
      const preferred =
        (tab ? allSlots.find((s) => s.tab?.id === tab.id) : null) ??
        allSlots.find((s) => s.id === selectedSlotId) ??
        allSlots[0]!;
      return [preferred];
    }
    return tabsLayout.slots.value;
  });

  const effectiveSlotLayout = computed<TabSlotLayoutId>(() => {
    if (!panelsEnabled.value) {
      return "single";
    }
    if (isMobile.value) {
      // Mobile never stacks — a single slot fills the viewport (see
      // effectiveSlots).
      return "single";
    }
    return tabsLayout.layout.value;
  });

  // Effective custom-pane list shown by the UI: on mobile every pane is
  // forced to fullscreen placement for rendering only — the manager's stored
  // placement is left untouched so it's restored on a desktop-size viewport.
  const effectivePanes = computed(() => {
    if (!isMobile.value) {
      return panes.panes.value;
    }
    return panes.panes.value.map((pane) =>
      pane.placement === "fullscreen"
        ? pane
        : { ...pane, placement: "fullscreen" as const }
    );
  });
  const currentReadingState = computed(() => {
    const selectedTabValue = selectedTab.value;

    if (!selectedTabValue) {
      return null;
    }

    return {
      tab: selectedTabValue,

      translationId: selectedTabValue.readingState.translationId.value,
      bookId: selectedTabValue.readingState.bookId.value,
      chapterNumber: selectedTabValue.readingState.chapterNumber.value,
    };
  });

  // Keep selection and slots aligned. Clicking a tab goes through
  // handleSelectTab (which also calls setSelectedSlotTab). removeTab only
  // updates selectedTabId — TabsLayoutManager's sync then clears the closed
  // tab from its slot (tab → null). If that emptied slot is still selected,
  // put the newly selected tab into it so TabsLayout keeps rendering a reader.
  //
  // Only fill empty slots: never overwrite a slot that already has a tab.
  // openInNewSlot clones via addTab (which selects the clone) before the new
  // slot exists; overwriting here would steal the original slot and leave an
  // empty pane after layout de-dupes the shared tab id.
  effect(() => {
    const tab = selectedTab.value;
    if (!tab) {
      return;
    }

    const matchingSlot =
      tabsLayout.slots.value.find((s) => s.tab?.id === tab.id) ?? null;
    if (matchingSlot) {
      tabsLayout.selectSlot(matchingSlot.id);
      return;
    }

    const selectedSlot =
      tabsLayout.slots.value.find(
        (s) => s.id === tabsLayout.selectedSlotId.value
      ) ??
      tabsLayout.slots.value[0] ??
      null;
    if (selectedSlot && !selectedSlot.tab) {
      tabsLayout.setSelectedSlotTab(tab.id);
    }
  });

  // Persist the non-ephemeral tab state (translation/book/chapter per tab, the
  // selected tab, the layout preset, and the slot arrangement) to localStorage
  // so TabsManager/TabsLayoutManager can restore it on the next refresh or
  // revisit. Session-backed tabs are skipped — they rejoin via `?sessionId=`
  // (see setupInitialSession). Client-only: there is no localStorage in SSR.
  if (typeof window !== "undefined") {
    let lastSerialized: string | null = null;

    const buildPersistedTabs = (): PersistedTab[] =>
      tabs.tabs.value
        .filter((tab) => !tab.sharedSession)
        .map((tab) => {
          const persisted: PersistedTab = {
            id: tab.id,
            translationId: tab.readingState.translationId.value,
            bookId: tab.readingState.bookId.value,
            chapterNumber: tab.readingState.chapterNumber.value,
          };
          if (tab.slotOnly) {
            persisted.slotOnly = true;
          }
          return persisted;
        });

    effect(() => {
      const persistedTabs = buildPersistedTabs();
      const persistableIds = new Set(persistedTabs.map((tab) => tab.id));

      const currentSlots = tabsLayout.slots.value;
      const slotTabIds = currentSlots.map((slot) =>
        slot.tab && persistableIds.has(slot.tab.id) ? slot.tab.id : null
      );
      const selectedSlotIndex = currentSlots.findIndex(
        (slot) => slot.id === tabsLayout.selectedSlotId.value
      );

      const currentSelectedTabId = tabs.selectedTabId.value;
      const selectedTabId = persistableIds.has(currentSelectedTabId)
        ? currentSelectedTabId
        : (persistedTabs[0]?.id ?? "");

      const nextState = {
        tabs: persistedTabs,
        selectedTabId,
        layout: tabsLayout.layout.value,
        slotTabIds,
        selectedSlotIndex: selectedSlotIndex >= 0 ? selectedSlotIndex : null,
      };

      // Position signals change often during navigation; skip writes that would
      // not change what is stored.
      const serialized = JSON.stringify(nextState);
      if (serialized === lastSerialized) {
        return;
      }
      lastSerialized = serialized;
      writeStoredTabsState(nextState);
    });
  }

  const title = computed(() => {
    const RTLE_CHAR = "\u202B";
    void i18n.language.value;
    const isRtl = i18n.isRtl.value;

    const { t } = i18n;

    const seedBibleTitle = t("seed-bible", {
      defaultValue: "Seed Bible",
    });

    const getTitle = () => {
      if (!selectedTab.value) {
        return seedBibleTitle;
      }

      return `${selectedTab.value.readingState.title.value} - ${selectedTab.value.readingState.subTitle.value} | ${seedBibleTitle}`;
    };

    return `${isRtl ? RTLE_CHAR : ""}${getTitle()}`;
  });

  const description = computed(() => {
    void i18n.language.value;
    const { t } = i18n;

    const chapter = selectedTab.value?.readingState.chapterData.value;
    if (!chapter) {
      // Truncated like every other branch: this key is translatable, and a
      // translation is free to be longer than the English default.
      return truncateForMeta(
        t("app-meta-description", { defaultValue: APP_META_DESCRIPTION }),
        META_DESCRIPTION_MAX_GRAPHEMES
      );
    }

    // Used whenever there is no scripture to quote — an empty chapter payload,
    // or a reference so long it leaves no room for any.
    const referenceOnly = () =>
      truncateForMeta(
        t("seed-bible-description", {
          bookName: chapter.book.name,
          chapterNumber: chapter.chapter.number,
          defaultValue: "Read {{bookName}} {{chapterNumber}} in the Seed Bible",
        }),
        META_DESCRIPTION_MAX_GRAPHEMES
      );

    const excerpt = buildChapterExcerpt(
      chapter.chapter.content,
      META_DESCRIPTION_MAX_GRAPHEMES
    );
    if (!excerpt) {
      return referenceOnly();
    }

    const compose = (scripture: string) =>
      t("chapter-meta-description", {
        bookName: chapter.book.name,
        chapterNumber: chapter.chapter.number,
        translationName: chapter.translation.shortName,
        excerpt: scripture,
        defaultValue:
          "{{bookName}} {{chapterNumber}} ({{translationName}}): {{excerpt}}",
      });

    // Charge the citation against the budget first, so what gets cut is always
    // scripture. Truncating only the composed string would instead chop the
    // citation off the end for any locale whose template puts it last.
    const scriptureBudget =
      META_DESCRIPTION_MAX_GRAPHEMES - countGraphemes(compose(""));
    const fitted =
      scriptureBudget > 0 ? truncateForMeta(excerpt, scriptureBudget) : "";
    if (!fitted) {
      return referenceOnly();
    }

    // Backstop for a template whose own literal text overruns the budget.
    return truncateForMeta(compose(fitted), META_DESCRIPTION_MAX_GRAPHEMES);
  });

  const siteName = computed(() => {
    void i18n.language.value;
    const { t } = i18n;

    return t("seed-bible", {
      defaultValue: "Seed Bible",
    });
  });

  /**
   * Read only when rendering meta tags on the server (see `entry-ssr.tsx`),
   * along with `description`.
   *
   * These two stay derived from the *loaded chapter*, unlike the reader's own
   * titles, which are derived from the book catalog so they can move the instant
   * navigation happens. Two reasons: a server render has no navigation to lag
   * behind, and it suspends until the first chapter settles, so content is there
   * whenever it could be. And when it genuinely isn't — a failed load — falling
   * back to a generic blurb is better than describing a chapter the server
   * could not actually serve.
   *
   * `title` is the exception and is position-derived: it also drives
   * `document.title` on the client, where the lag would be visible.
   * `canonicalUrl` is position-derived too, for a different reason — see there.
   */
  const socialTitle = computed(() => {
    void i18n.language.value;
    const { t } = i18n;

    const chapter = selectedTab.value?.readingState.chapterData.value;
    if (!chapter) {
      return t("read-the-bible", {
        defaultValue: "Read the Bible",
      });
    }

    return t("social-title", {
      defaultValue: "Read {{bookName}} {{chapterNumber}}",
      bookName: chapter.book.name,
      chapterNumber: chapter.chapter.number,
    });
  });

  /**
   * The one URL that should be indexed for whatever the reader is looking at.
   *
   * Derived from the reading *position* signals, not from `chapterData`. Those
   * are set from the URL when the tab is constructed, with no network involved,
   * so this stays correct in the three cases where a chapter never arrives — an
   * API failure, a book absent from the translation, or the server's five-second
   * load timeout. Keying off the loaded chapter meant all three server-rendered
   * as `<link rel="canonical" href="/">`, pointing the whole site at its own
   * front page. A transient upstream failure shouldn't change a chapter's
   * address, and a book that doesn't exist at all is already answered with a 404
   * (see `entry-ssr.tsx`), so there is nothing left for the old fallback to
   * protect against.
   *
   * The language segment follows the *translation*, not the reader's UI
   * language: someone reading the English AAB with a French interface is
   * looking at the same scripture as someone reading it in English, so both
   * point at `/en/AAB/…` instead of each claiming to be canonical. This is the
   * same mapping the sitemap generator uses, so the URLs it publishes and the
   * pages they lead to agree.
   *
   * Always the explicit four-segment form. The short three-segment form is a
   * redirect entry point — requested without an `Accept-Language` header, which
   * is what a crawler sends, it 302s to the explicit form — so naming it here
   * would point every canonical at a URL that redirects.
   */
  const canonicalUrl = computed(() => {
    const readingState = selectedTab.value?.readingState;
    const bookId = readingState?.bookId.value;

    if (!readingState || !bookId) {
      return navigation.basePath || "/";
    }

    const translationId = data.buildTranslationId(
      readingState.translationId.value
    );
    const language =
      bibleLanguageToUiLocale(readingState.translation.value?.language) ??
      uiLocaleForDefaultTranslation(translationId) ??
      i18n.language.value;

    const readingPath = buildReadingPath({
      language,
      translationId,
      bookId: bookId as BookId,
      chapter: readingState.chapterNumber.value,
    });

    return `${navigation.basePath}${readingPath}`;
  });

  effect(() => {
    if (!selectedTab.value) {
      return;
    }

    const chapter = selectedTab.value.readingState.chapterData.value;
    if (!chapter) {
      return;
    }

    const readingHistoryTimeoutId = setInterval(() => {
      readingHistory.saveReadingHistory(
        chapter.book.id,
        chapter.chapter.number
      );
    }, 5000);

    const posthogTimeoutId = setTimeout(() => {
      if (typeof posthog === "undefined" || !posthog) {
        return;
      }
      posthog?.capture("user_chapter_read", {
        translationId: chapter.translation.id,
        bookId: chapter.book.id,
        chapter: String(chapter.chapter.number),
      });
    }, 30_000);

    return () => {
      clearInterval(readingHistoryTimeoutId);
      clearTimeout(posthogTimeoutId);
    };
  });

  const closeSidebarAndSettings = () => {
    sidebar.closeSettings();
    sidebar.closeSidebar();
  };

  const handleSelectTab = (tabId: string) => {
    closeSidebarAndSettings();
    tabs.selectTab(tabId);
    tabsLayout.setSelectedSlotTab(tabId);
    panes.closeFullscreenPanes();
  };

  const handleAddTab = () => {
    closeSidebarAndSettings();
    const targetSlot =
      tabsLayout.slots.value.find(
        (slot) => slot.id === tabsLayout.selectedSlotId.value
      ) ?? tabsLayout.slots.value[0]!;

    void selector.setOpen(true, targetSlot, { forNewTab: true });
  };

  const handleOpenInNewSlot = (tabId: string) => {
    closeSidebarAndSettings();
    const slot = tabsLayout.openTabInNewSlot(tabId);
    if (slot?.tab) {
      tabs.selectTab(slot.tab.id);
    }
  };

  const handleSelectSlot = (slotId: string) => {
    closeSidebarAndSettings();
    tabsLayout.selectSlot(slotId);

    const selectedSlot =
      tabsLayout.slots.value.find((slot) => slot.id === slotId) ?? null;
    if (selectedSlot?.tab) {
      tabs.selectTab(selectedSlot.tab.id);
    }
  };

  const handleSelectPane = (paneId: string) => {
    closeSidebarAndSettings();
    panes.selectPane(paneId);
  };

  // App-level toast: a single popup shown at the bottom of the screen for 3.5s.
  // A new call overwrites the current toast and restarts the timer, so only the
  // most recent message is ever visible. The incrementing id keys the render so
  // the slide-in animation replays even for a repeated message.
  //
  // Defined here (rather than further down, where it's exposed on `state`)
  // because the host-disconnect handling below also calls it, and that
  // effect runs immediately when constructed.
  const currentToast = signal<{ id: number; message: string } | null>(null);
  let toastSeq = 0;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  const toast = (message: string) => {
    if (toastTimer !== null) {
      clearTimeout(toastTimer);
    }
    currentToast.value = { id: ++toastSeq, message };
    toastTimer = setTimeout(() => {
      currentToast.value = null;
      toastTimer = null;
    }, 3500);
  };

  // Wraps a session so that when it's disposed (via tabs.removeTab), its
  // entry is removed from the global shared-sessions registry too. The
  // registry is opened by every client, so other users see the session
  // disappear automatically.
  //
  // Additionally: if THIS client is the host (by user id or connection id),
  // mark `endedAt` in the session's shared options before tearing down.
  // Participants watch for `endedAt` and auto-close their tab (see the
  // effect below), which is the behavior the host expects when they end
  // or close a shared tab.
  const wrapSessionLifecycle = (
    session: BibleReadingSession
  ): BibleReadingSession => {
    const originalDispose = session.dispose.bind(session);
    session.dispose = () => {
      const hostUserId = session.options.value.hostUserId;
      const localId = login.userId.value;
      const localConnectionId = os.connectionId;
      // Trust `locallyHostedSessionIds` over the identity comparison —
      // after a login/logout the current login.userId / configBot.id no
      // longer match the original `hostUserId`, but we're still the host
      // of sessions we created in this run.
      const options = session.options.value;
      const isHost =
        locallyHostedSessionIds.has(session.id) ||
        (hostUserId !== null &&
          (hostUserId === localId || hostUserId === localConnectionId)) ||
        isSessionHost(options, localId) ||
        isSessionHost(options, localConnectionId);

      // Only end the session for everyone when the leaving client is the
      // LAST connected host/co-host. If another host/co-host is still
      // present (e.g. one was just appointed), hand the session off instead
      // of ending it. Explicit "End session" writes `endedAt` directly, so
      // it bypasses this heuristic.
      const anotherHostStillConnected = session.connectedUsers.value.some(
        (user) =>
          !user.isSelf &&
          (isSessionHost(options, user.userId) ||
            isSessionHost(options, user.connectionId))
      );

      if (isHost && !anotherHostStillConnected && options.endedAt === null) {
        try {
          session.updateOptions({ endedAt: Date.now() });
        } catch {
          // Best-effort — don't block teardown if the CRDT write fails.
        }
      }

      locallyHostedSessionIds.delete(session.id);
      void invitations.unpublishSession(session.id);
      originalDispose();
    };
    return session;
  };

  // Sessions THIS client created locally. The host-disconnect auto-close
  // below skips these — when the local user logs in/out the OS may
  // re-establish the underlying connection with a new connectionId/userId,
  // which would make the original `hostUserId` look "disconnected" even
  // though the host (us) is still right here. The host's own tab only
  // closes through explicit teardown (close button / "End Session"),
  // never through the disconnect heuristic.
  const locallyHostedSessionIds = new Set<string>();

  // Suppresses the host-disconnect grace timer for a short window right
  // after the tab returns to the foreground. On mobile, backgrounding the
  // app lets its own connection go stale; right as it resumes, this
  // client's own `connectedUsers` view can still read "host missing" for a
  // few seconds even though the host never left. `session.isSynced` (below)
  // covers most of this, but the underlying connection can briefly report
  // itself synced again a beat before it's actually caught up, so this is
  // extra insurance layered on top of it.
  const RESUME_GRACE_MS = 5000;
  const justResumedFromBackground = signal(false);
  let resumeGraceTimer: ReturnType<typeof setTimeout> | null = null;
  if (typeof document !== "undefined" && !import.meta.env.SSR) {
    effect(() => {
      const handleVisibilityChange = () => {
        if (document.visibilityState !== "visible") return;
        justResumedFromBackground.value = true;
        if (resumeGraceTimer !== null) {
          clearTimeout(resumeGraceTimer);
        }
        resumeGraceTimer = setTimeout(() => {
          justResumedFromBackground.value = false;
          resumeGraceTimer = null;
        }, RESUME_GRACE_MS);
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () =>
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
    });
  }

  // Auto-close participant tabs when the host goes away. Two signals:
  //  (a) `options.endedAt` was written by the host (clean "End Session"
  //      action — works when the CRDT flushes before the host disconnects).
  //  (b) The host was previously in `connectedUsers` but has since left —
  //      catches the host-browser-close case even if the `endedAt` write
  //      never made it across the wire.
  //
  // We remember per-session that the host was at least once connected, so
  // joiners don't immediately close their own tab on connect before they
  // even see the host. We also debounce the disconnect-close path — a
  // host who logs in mid-session will briefly look disconnected (their
  // OS connection re-establishes with a new identity), and we want their
  // updated `hostUserId` to land via the CRDT before we close the tab.
  //
  // Signal (b) is judged from THIS client's own `connectedUsers` view,
  // which is only trustworthy while this client's own connection is
  // synced (`session.isSynced`) and not still catching up right after a
  // mobile resume (`justResumedFromBackground`). Otherwise a client's own
  // stale/resyncing connection can make the host look gone when it never
  // left — see issue #1346.
  const sessionsWhereHostWasSeen = new Set<string>();
  const HOST_DISCONNECT_GRACE_MS = 30000;
  const pendingHostDisconnectTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  const clearPendingHostDisconnect = (sessionId: string): boolean => {
    const timer = pendingHostDisconnectTimers.get(sessionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      pendingHostDisconnectTimers.delete(sessionId);
      return true;
    }
    return false;
  };
  const sessionHostIsConnected = (session: BibleReadingSession): boolean =>
    session.connectedUsers.value.some(
      (user) =>
        isSessionHost(session.options.value, user.userId) ||
        isSessionHost(session.options.value, user.connectionId)
    );
  // Whether this client's view of who's present is worth acting on. We are
  // definitionally present in our own session, so a list that doesn't even
  // include us means the presence channel is broken (it can go permanently
  // silent after a dropped connection) — and "the host isn't in the list"
  // tells us nothing at all. Never eject anyone on that basis.
  const sessionPresenceIsTrustworthy = (
    session: BibleReadingSession
  ): boolean =>
    session.isSynced.value &&
    session.connectedUsers.value.some((user) => user.isSelf);
  effect(() => {
    for (const tab of tabs.tabs.value) {
      const session = tab.sharedSession;
      if (!session) continue;

      if (session.options.value.endedAt !== null) {
        sessionsWhereHostWasSeen.delete(session.id);
        clearPendingHostDisconnect(session.id);
        tabs.removeTab(tab.id);
        continue;
      }

      // Never auto-close a session this client created — the host is the
      // local user, and any apparent host disconnect is an identity flip
      // (login/logout), not a real departure.
      if (locallyHostedSessionIds.has(session.id)) continue;

      const hostId = session.options.value.hostUserId;
      if (!hostId) continue;

      // A session stays alive as long as the host OR any co-host is present,
      // so appointing a co-host lets the original host leave without kicking
      // everyone else out.
      const hostIsConnected = sessionHostIsConnected(session);
      const { t } = i18n;

      if (hostIsConnected) {
        sessionsWhereHostWasSeen.add(session.id);
        // Host came back (e.g. reconnected after their login flow) — cancel
        // any pending close so the tab survives the round-trip.
        if (clearPendingHostDisconnect(session.id)) {
          toast(
            t("session-host-reconnected", {
              defaultValue: "Reconnected to the session",
            })
          );
        }
      } else if (
        sessionsWhereHostWasSeen.has(session.id) &&
        !pendingHostDisconnectTimers.has(session.id) &&
        sessionPresenceIsTrustworthy(session) &&
        !justResumedFromBackground.value
      ) {
        // Host appears to have left, but it may be a transient reconnect
        // (host logging in/out) — wait briefly to give the CRDT time to
        // deliver a new `hostUserId` or for the host's connection to
        // re-appear before tearing down. We only get here once THIS
        // client's own connection is synced and past its post-resume grace
        // window, so this reading is trustworthy enough to start the timer
        // (though it's re-verified again below right before acting on it).
        const tabId = tab.id;
        const sessionId = session.id;
        toast(
          t("session-host-reconnecting", {
            defaultValue: "Reconnecting to the session…",
          })
        );
        const timer = setTimeout(() => {
          pendingHostDisconnectTimers.delete(sessionId);
          const currentTab = tabs.tabs.value.find(
            (candidateTab) => candidateTab.id === tabId
          );
          const currentSession = currentTab?.sharedSession;
          if (!currentSession || currentSession.id !== sessionId) {
            // Tab/session already gone (e.g. closed some other way).
            sessionsWhereHostWasSeen.delete(sessionId);
            return;
          }
          if (
            !sessionPresenceIsTrustworthy(currentSession) ||
            sessionHostIsConnected(currentSession)
          ) {
            // Our own connection is still resyncing, our presence view is
            // unreliable, or the host is actually back — don't tear down on
            // stale/incomplete information. The effect above will
            // re-evaluate and re-arm this timer if the host is still
            // genuinely gone once presence is trustworthy again.
            return;
          }
          sessionsWhereHostWasSeen.delete(sessionId);
          toast(
            t("session-host-left", {
              defaultValue: "The host left — you were removed from the session",
            })
          );
          tabs.removeTab(tabId);
        }, HOST_DISCONNECT_GRACE_MS);
        pendingHostDisconnectTimers.set(sessionId, timer);
      }
    }
  });

  // When the local user's identity changes (login/logout) and they host
  // sessions, push the new identity into each session's `hostUserId` via
  // the CRDT. Without this update, joiners' host-detection would still be
  // looking for the host's previous (anonymous) connection id and would
  // never re-acquire them as host on the new connection.
  effect(() => {
    const newLoginUserId = login.userId.value;
    const localConnectionId = os.connectionId;
    const desiredHostId = newLoginUserId ?? localConnectionId;
    if (!desiredHostId) return;
    for (const tab of tabs.tabs.value) {
      const session = tab.sharedSession;
      if (!session) continue;
      if (!locallyHostedSessionIds.has(session.id)) continue;
      if (session.options.value.hostUserId === desiredHostId) continue;
      try {
        session.updateOptions({ hostUserId: desiredHostId });
      } catch {
        // Best-effort — joiners will fall back to their grace-period
        // timeout if the update can't be delivered.
      }
    }
  });

  const handleCreateSharedSession = async () => {
    closeSidebarAndSettings();
    // Start the session where the user is reading, not at the default book.
    const activeReadingState = selectedTab.value?.readingState ?? null;
    const session = await sessions.createSession(
      activeReadingState
        ? getSessionStartPosition(activeReadingState)
        : undefined
    );
    if (typeof posthog !== "undefined" && posthog) {
      posthog.capture("create_session", {
        sessionId: session.id,
      });
    }
    locallyHostedSessionIds.add(session.id);
    wrapSessionLifecycle(session);
    // Auto-publish: the moment a shared tab is created, other logged-in
    // users see it in their sidebar and can click to join — no manual
    // invite/notification step.
    void invitations.publishSession(session);
    const tab = tabs.addTab(session);
    tabsLayout.setSelectedSlotTab(tab.id);
    return session;
  };

  const handleJoinSharedSession = async (id: string) => {
    closeSidebarAndSettings();
    const session = await sessions.joinSession(id);
    if (typeof posthog !== "undefined" && posthog) {
      posthog.capture("join_session", {
        sessionId: session.id,
      });
    }
    wrapSessionLifecycle(session);
    const tab = tabs.addTab(session);
    tabsLayout.setSelectedSlotTab(tab.id);
    return session;
  };

  const handleOpenVerseReference = async (ref: VerseRef) => {
    panes.closeFullscreenPanes();
    let tab = selectedTab.value;

    if (!tab) {
      tab = tabs.tabs.value[0] ?? null;
    }

    if (tab) {
      const translationid =
        tab.readingState.translationId.value ??
        tab.readingState.defaultTranslation.id;
      await tab.readingState.selectTranslationAndChapter(
        translationid,
        ref.book,
        ref.chapter,
        {
          scrollToVerse: ref.verse,
        }
      );
    } else {
      tab = tabs.addTab(undefined, {
        initialBookId: ref.book,
        initialChapterNumber: ref.chapter,
        scrollToVerse: ref.verse,
      });
    }

    if (ref.verse) {
      const verses = ref.endVerse
        ? range(ref.verse, ref.endVerse + 1)
        : ref.verse;
      tab.readingState.decorateVerses(ref.book, ref.chapter, verses, {
        className: "sb-verse-decoration-diminish",
        containerClassName: "sb-chapter-decoration-diminish",
        removeAfterMs: 3000,
      });
    }
  };

  const handleOpenChat = (sharedChat: ChatSession) => {
    sidebar.openChatPanel();
    chats.selectChat(sharedChat.id);
  };

  const invitations = createInvitationsManager(os, login, async (sessionId) => {
    await handleJoinSharedSession(sessionId);
  });

  const setupInitialSession = async () => {
    // Joining a session opens a live WebSocket — never do this during SSR.
    if (typeof window === "undefined") {
      return;
    }
    const initialSessionId =
      navigation.currentUrl.value.searchParams.get("sessionId");
    if (!initialSessionId) {
      return;
    }

    await handleJoinSharedSession(initialSessionId);
  };

  // Tell the user when we signed them out for them. `login.sessionEnded` only fires
  // when a forced sign-out actually happened, so this can't toast for a request that
  // merely failed, nor for a sign-out the user asked for. Without a message they
  // would just watch their highlights and bookmarks vanish with no explanation.
  effect(() => {
    const ended = login.sessionEnded.value;
    if (!ended || typeof window === "undefined") {
      return;
    }

    // Destructured rather than called as `i18n.t(...)`: the translation lint rules
    // only recognise calls to a bare `t`, and `translation-unused-keys` is
    // auto-fixable, so `i18n.t("...")` would get these keys deleted from en.json.
    const { t } = i18n;
    toast(
      ended.reason === "account_suspended"
        ? t("account-suspended-message", {
            defaultValue: "Your account has been suspended.",
          })
        : t("signed-out-message", {
            defaultValue: "You've been signed out. Please sign in again.",
          })
    );
  });

  // const isDiscoverOpen = signal(false);
  const handleOpenDiscover = () => {
    if (!playlists.view.peek()) {
      playlists.view.value = playlists.playing.peek()
        ? "play_playlist"
        : "discover";
    } else {
      playlists.view.value = null;
    }
  };
  const handleCloseDiscover = () => {
    playlists.view.value = null;
  };

  effect(() => {
    const isPlaying = !!playlists.playing.value;
    if (isPlaying && !isMobile.value) {
      playlists.view.value = playlists.playing.peek()
        ? "play_playlist"
        : "discover";
    }
  });

  // // When the app is opened via a shared `?playlist={recordName}.{id}` link,
  // // load that playlist and start playing it immediately. The locator's `id` is
  // // always `playlist_<uuid>` (never contains a dot), so we split on the LAST dot
  // // to stay correct even when the `recordName` itself contains dots.
  // const setupInitialPlaylist = async () => {
  //   // Loading/playing touches the network and the reader — never during SSR.
  //   if (typeof window === "undefined") {
  //     return;
  //   }
  //   const locator = navigation.currentUrl.value.searchParams.get("playlist");
  //   if (!locator) {
  //     return;
  //   }
  //   const lastDot = locator.lastIndexOf(".");
  //   if (lastDot <= 0 || lastDot === locator.length - 1) {
  //     console.error("Invalid playlist locator:", locator);
  //     return;
  //   }
  //   const recordName = locator.slice(0, lastDot);
  //   const id = locator.slice(lastDot + 1);
  //   try {
  //     const playlist = await playlists.loadPlaylist(recordName, id);
  //     playlists.startPlaying(playlist);
  //     handleOpenDiscover();
  //   } catch (error) {
  //     console.error("Failed to load playlist from URL:", error);
  //     const { t } = i18n;
  //     toast(
  //       t("failed-to-load-playlist", {
  //         defaultValue: "Failed to load playlist",
  //       })
  //     );
  //   }
  // };

  // Run the playlist setup after the session join: `startPlaying` prefers a
  // shared-session tab, so a link carrying both `?sessionId=` and `?playlist=`
  // should target the session tab created by the join.
  void setupInitialSession();
  //.then(() => setupInitialPlaylist());

  const state: SeedBibleState = {
    os,
    bibleData: data,
    theme: {
      ...themeManager,
      themeCssVariables,
      themeCssClasses,
    },
    sidebar,
    tabs,
    tabsLayout,
    panes,
    selector,
    tools,
    login,
    readingHistory,
    highlights,
    bookmarks,
    annotations,
    chats,
    sessions,
    modals,
    settings,
    invitations,
    search,
    navigation,
    i18n,
    discover,
    readingExtensions,
    extensions,
    readingPlans,
    playlists,
    tutorial,
    onboarding,
    isTermsOpen,
    openTerms,
    closeTerms,
    isPrivacyOpen,
    openPrivacy,
    closePrivacy,
    isCodeOfConductOpen,
    openCodeOfConduct,
    closeCodeOfConduct,
    features,
    app: {
      createSharedSession: handleCreateSharedSession,
      joinSharedSession: handleJoinSharedSession,
      panelsEnabled,
      selectedTab,
      effectiveSlots,
      effectiveSlotLayout,
      effectivePanes,
      viewportWidth,
      viewportHeight,
      isMobile,
      isMobileLandscape,
      isCompactDesktop,
      currentReadingState,
      selectTab: handleSelectTab,
      addTab: handleAddTab,
      openInNewSlot: handleOpenInNewSlot,
      selectSlot: handleSelectSlot,
      selectPane: handleSelectPane,
      closeFullscreenPanes: panes.closeFullscreenPanes,
      openVerseReference: handleOpenVerseReference,
      openChat: handleOpenChat,
      title,
      description,
      siteName,
      canonicalUrl,
      socialTitle,
      currentToast,
      toast,
      isDiscoverOpen: playlists.isDiscoverOpen,
      openDiscover: handleOpenDiscover,
      closeDiscover: handleCloseDiscover,
    },
  };

  // Discover is rendered as the app's single managed side pane, mirrored from
  // `playlists.view` (defined here rather than next to `handleOpenDiscover`
  // above so the pane's `component` thunk can close over the finished `state`).
  // `view` stays the source of truth for both whether Discover is open and
  // which sub-view shows inside it; DiscoverPane routes discover/create/play
  // internally off the same signal.
  const DISCOVER_PANE_ID = "discover-pane";

  // view -> pane: open (or refresh, by reusing the id) while a view is set,
  // close when it clears. The pane commands read pane state via peek()
  // internally (see PanesManager), so this effect does NOT subscribe to
  // `panes` — closing the pane below (which mutates `panes`) can't retrigger
  // this effect and re-open the pane mid-update, which would trip preact's
  // "Cycle detected". The pane -> view effect below clears `view` on close.
  effect(() => {
    if (playlists.view.value) {
      panes.openPane({
        id: DISCOVER_PANE_ID,
        placement: "side",
        title: () => <DiscoverPaneTitle playlists={playlists} />,
        header: () => <DiscoverPaneHeader playlists={playlists} />,
        onClose: (reason) => {
          if (reason !== "user") {
            return;
          }
          const currentlyPlaying = playlists.playing.value;
          if (currentlyPlaying) {
            playlists.stopPlaying();
          }
        },
        component: () => (
          <DiscoverPane
            state={state}
            tabs={tabs}
            playlists={playlists}
            modals={modals}
            toast={state.app.toast}
          />
        ),
      });
    } else {
      panes.closePane(DISCOVER_PANE_ID); // no-op when already closed
    }
  });

  // pane -> view: when the pane is closed via its header, or replaced by
  // another side pane (only one side pane may be open at a time), clear the
  // view so the toggle re-opens it on the next click. `peek()` keeps this from
  // looping against the effect above.
  effect(() => {
    const paneOpen = panes.panes.value.some(
      (pane) => pane.id === DISCOVER_PANE_ID
    );
    if (!paneOpen && playlists.view.peek()) {
      playlists.view.value = null;
    }
  });

  // Settings UI language changes also select the nearest available Bible
  // translation (preferred ID → same language in catalog → LANG_META.fallback
  // → English), using existing tabs + selector state. Keep the user on the
  // same book/chapter/verse when the new translation has that book.
  i18n.setBibleTranslationApplicator(
    async (translation) => {
      const tab = selectedTab.value;
      if (tab) {
        const currentBookId = tab.readingState.bookId.peek();
        const currentChapterNumber = tab.readingState.chapterNumber.peek();
        const currentVerse =
          tab.readingState.selectedVerses
            .peek()
            .find(
              (verse) =>
                verse.bookId === currentBookId &&
                verse.chapterNumber === currentChapterNumber
            )?.verse.number ??
          tab.readingState.scrollToVerse.peek() ??
          undefined;

        let matchingBook: { id: string } | undefined;
        try {
          const books = await data.getTranslationBooks(translation.id);
          matchingBook = currentBookId
            ? books.books.find((book) => book.id === currentBookId)
            : undefined;
        } catch {
          // Catalog isn't cached yet and the fetch failed — fall through to
          // selectTranslation, which handles its own errors the way this
          // path did before position preservation was added.
        }

        if (matchingBook && currentChapterNumber != null) {
          await tab.readingState.selectTranslationAndChapter(
            translation.id,
            matchingBook.id,
            currentChapterNumber,
            currentVerse != null ? { scrollToVerse: currentVerse } : undefined
          );
        } else {
          await tab.readingState.selectTranslation(translation.id);
        }
      }
      await selector.selectTranslation(translation.id);
    },
    () => data.availableTranslations.value,
    async () => {
      if (data.availableTranslations.value.length === 0) {
        await data.getTranslations();
      }
      return data.availableTranslations.value;
    }
  );

  setupExtensionContext(state);

  return state;
}
