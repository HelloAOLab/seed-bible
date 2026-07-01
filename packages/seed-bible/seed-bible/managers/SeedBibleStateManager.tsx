import { createBibleSelectorState } from "../managers/BibleSelectorManager";
import type { BibleSelectorState } from "../managers/BibleSelectorManager";
import {
  createBibleDataManager,
  type BibleDataManager,
} from "../managers/BibleDataManager";
import { createBibleToolsManager } from "../managers/BibleToolsManager";
import type { ToolsManager } from "../managers/BibleToolsManager";
import { createConfig } from "../managers/ConfigManager";
import type { ConfigManager } from "../managers/ConfigManager";
import {
  FreeUseBibleAPI,
  getDefaultAPIEndpoint,
} from "../managers/FreeUseBibleAPI";
import { createPanes } from "../managers/PanesManager";
import type { Pane, PanesManager } from "../managers/PanesManager";
import { createLoginManager } from "../managers/LoginManager";
import type { LoginManager } from "../managers/LoginManager";
import { createSidebar } from "../managers/SidebarManager";
import { createTabs } from "../managers/TabsManager";
import type { ReaderTab, TabsManager } from "../managers/TabsManager";
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
  createSessionsManager,
  type BibleReadingSession,
  type SessionsManager,
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
import type { AppConfig } from "../app/appConfig";
import { createI18nManager, type I18nManager } from "../i18n";
import {
  createOnboardingManager,
  type OnboardingManager,
} from "../managers/OnboardingManager";
import {
  createTutorialManager,
  type TutorialManager,
} from "../managers/TutorialManager";
import {
  createReadingPlansManager,
  type ReadingPlansManager,
} from "../managers/ReadingPlansManager";
import {
  createDiscoverManager,
  type DiscoverManager,
} from "../managers/DiscoverManager";

type SidebarManager = ReturnType<typeof createSidebar>;
type SearchManager = ReturnType<typeof createSearchManager>;

/**
 * App-wide mobile breakpoint, in pixels. Viewports at or below this width use
 * the mobile layout (drawer sidebar, mobile header, full-screen selector);
 * above it the docked desktop layout applies. This is the single source of
 * truth for the JS side — the matching `@media (max-width: 768px)` /
 * `(min-width: 769px)` rules in app/main.css must be kept in sync by hand.
 */
export const MOBILE_BREAKPOINT = 768;

/**
 * Derived app-level state and high-level actions used by UI components.
 *
 * These values are mostly computed from lower-level managers and represent
 * the currently active reading context and pane selection.
 */
export interface AppState {
  /** True when multi-pane layouts are enabled by config. */
  panelsEnabled: ReadonlySignal<boolean>;
  /** Currently selected reading tab, or null when no tab is available. */
  selectedTab: ReadonlySignal<ReaderTab | null>;
  /** Effective pane list shown by the UI (single pane fallback when panels are disabled). */
  effectivePanes: ReadonlySignal<Pane[]>;

  /** Current window inner width in pixels. Updated on resize. */
  viewportWidth: ReadonlySignal<number>;
  /** Current window inner height in pixels. Updated on resize. */
  viewportHeight: ReadonlySignal<number>;

  /** True when viewport width is at or below the mobile breakpoint (768px). */
  isMobile: ReadonlySignal<boolean>;
  /** True when on a phone-sized viewport held in landscape orientation. */
  isMobileLandscape: ReadonlySignal<boolean>;

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

  /** Selects a tab and synchronizes pane focus. */
  selectTab: (tabId: string) => void;
  /** Creates a new tab and selects it. */
  addTab: () => void;
  /** Opens an existing tab in a new attached pane. */
  openInNewPane: (tabId: string) => void;
  /** Opens an existing tab in a detached pane. */
  openInDetachedPane: (tabId: string) => void;
  /** Selects a pane and updates related UI state. */
  selectPane: (paneId: string) => void;
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
  currentToast: ReadonlySignal<{ id: number; message: string } | null>;
  /**
   * Shows a toast message at the bottom of the screen for 3.5s.
   * Calling again replaces the current toast and restarts the timer
   * (only one toast is ever visible at a time, always the most recent).
   */
  toast: (message: string) => void;
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
  /** Persisted app configuration (layout, font size, etc.). */
  config: ConfigManager;
  /** Theme manager plus derived CSS variables/classes for rendering. */
  theme: ThemeManager & {
    themeCssVariables: ReadonlySignal<string>;
    themeCssClasses: ReadonlySignal<string>;
  };
  /** Sidebar/settings visibility manager. */
  sidebar: SidebarManager;
  /** Reader tab lifecycle manager. */
  tabs: TabsManager;
  /** Pane layout and detached pane manager. */
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
  /** Shared reading sessions manager. */
  sessions: SessionsManager;
  /** Modal manager for app-wide dialog state and rendering. */
  modals: ModalManager;
  /** App-level settings: book orientation, UI text size, selection UI, etc. */
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
  /** Aggregated computed app state and top-level UI actions. */
  app: AppState;
  /** Extension loading and runtime manager. */
  extensions: ExtensionManager;

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
}

export function createSeedBibleState(
  options: CreateSeedBibleStateOptions = {}
): SeedBibleState {
  console.log("Creating SeedBibleState with options:", options);

  const navigation = createNavigationManager({
    initialHref: options.initialHref,
    basePath: options.config?.basePath,
  });
  const api = new FreeUseBibleAPI(
    getDefaultAPIEndpoint(navigation.currentUrl.value)
  );
  const i18n = createI18nManager(
    navigation,
    options.config?.acceptedLanguages ?? []
  );
  const data = createBibleDataManager(api);
  const os = CasualOSManager();
  const login = createLoginManager({ os });
  const highlights = createHighlightsManager(os, login);
  const bookmarks = createBookmarksManager(os, login);
  const config = createConfig(login, navigation);
  const themeManager = createTheme(login, navigation);
  const sidebar = createSidebar(navigation);
  const discover = createDiscoverManager();
  const tabs = createTabs(navigation, data, highlights, i18n, discover);
  const panes = createPanes(tabs, tabs.selectedTabId);
  const settings = createSettings(os, login, navigation);
  const selector = createBibleSelectorState(
    data,
    tabs,
    panes,
    settings,
    sidebar,
    bookmarks,
    navigation
  );
  const tools = createBibleToolsManager();
  const readingHistory = createReadingHistoryManager(os, login);
  const annotations = createAnnotationsManager(os, login);
  const sessions = createSessionsManager(os, data, login, highlights, i18n);
  const extensions = createExtensionManager(login, {
    defaultExtensions: SEED_BIBLE_EXTENSIONS,
  });
  const modals = createModalManager();
  const search = createSearchManager();
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
  const panelsEnabled = computed(() => !config.config.value.disablePanels);
  const selectedTab = computed(
    () =>
      tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null
  );

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

  const tutorial = createTutorialManager(login, onboarding, selector, isMobile);

  // A phone held sideways: landscape orientation with the short viewport
  // height typical of phones. Tablets/desktops in landscape have more
  // vertical room and are excluded by the height cap.
  const isMobileLandscape = computed(
    () =>
      viewportHeight.value > 0 &&
      viewportHeight.value <= 600 &&
      viewportWidth.value > viewportHeight.value
  );

  // True when a multi-pane layout is active — i.e. the user picked anything
  // other than "single" from the Panels menu (split-2v, split-3v, grid-2x2,
  // …), or more than one attached pane is otherwise open. Detached overlay
  // panes (extension tools, playlist, etc.) don't count. Keyed primarily off
  // the layout preset so selecting a layout from the menu reacts immediately.
  const hasMultiplePanes = computed(
    () =>
      panelsEnabled.value &&
      (panes.layout.value !== "single" ||
        panes.panes.value.filter((pane) => !pane.detached).length > 1)
  );

  // A docked-sidebar desktop layout that has become too narrow for the
  // sidebar and reader to comfortably share the row. Excludes mobile
  // (<= 768), where the sidebar is a drawer and `isSidebarCollapsed` does not
  // apply. The 1200px ceiling mirrors the CSS breakpoint.
  const isNarrowDesktop = computed(
    () => viewportWidth.value > 768 && viewportWidth.value <= 1200
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

  // Collapse the docked sidebar by default when a multi-pane layout is active,
  // so the panes get the horizontal space instead of competing with the
  // sidebar. Reacting only to the boolean means this fires once per transition
  // into multi-pane and still lets the user manually re-expand afterwards.
  effect(() => {
    if (hasMultiplePanes.value) {
      sidebar.isSidebarCollapsed.value = true;
    }
  });

  // Drive the docked sidebar's collapsed state from the viewport width so the
  // three layouts hand off cleanly:
  //   - mobile (<= 768): the sidebar is a drawer (isMobileOpen); the docked
  //     collapsed flag does not apply, so leave it untouched.
  //   - narrow desktop (769–1200): collapse to sb-tabs-sidebar-collapsed so
  //     the reader keeps usable horizontal space.
  //   - wide desktop (> 1200): restore the regular expanded sidebar.
  // The effect reads only the booleans (not raw width), so it re-runs solely
  // when crossing the 768/1200 boundaries — manual toggling within a band is
  // preserved.
  effect(() => {
    if (isMobile.value) {
      return;
    }
    sidebar.isSidebarCollapsed.value = isNarrowDesktop.value;
  });

  const buildSingleSelectedPane = (): Pane[] =>
    selectedTab.value
      ? [
          {
            id: "single-pane",
            tab: selectedTab.value,
            component: null,
            gridPortal: null,
            mapPortal: null,
            inst: null,
            pattern: null,
            query: null,
            detached: false,
            detachedAnchor: "floating" as const,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
          },
        ]
      : [];

  const effectivePanes = computed(() => {
    if (!panelsEnabled.value) {
      return buildSingleSelectedPane();
    }
    if (isMobile.value) {
      // On mobile we only show a single attached pane at a time. Prefer the
      // pane that hosts the currently selected tab; fall back to the manager's
      // selected pane, then the first attached pane.
      const allPanes = panes.panes.value;
      const tab = selectedTab.value;
      const selectedPaneId = panes.selectedPaneId.value;
      const attachedPanes = allPanes.filter((p) => !p.detached);
      const detachedPanes = allPanes.filter((p) => p.detached);
      const matching =
        (tab ? attachedPanes.find((p) => p.tab?.id === tab.id) : null) ??
        attachedPanes.find((p) => p.id === selectedPaneId) ??
        attachedPanes[0] ??
        null;
      const base = matching ? [matching] : buildSingleSelectedPane();
      // Detached panes (extension tools, playlist, etc.) are always kept so
      // they render as overlays in front of the attached pane. PaneLayout
      // gives detached panes a higher z-index than attached ones, so they sit
      // above the reader and stay interactable instead of being hidden.
      return [...base, ...detachedPanes];
    }
    return panes.panes.value;
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

  effect(() => {
    if (selectedTab.value) {
      const matchingPane =
        panes.panes.value.find((p) => p.tab?.id === selectedTab.value?.id) ??
        null;
      if (matchingPane) {
        panes.selectPane(matchingPane.id);
      }
    }
  });

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

      const chapter = selectedTab.value.readingState.chapterData.value;
      if (!chapter) {
        return seedBibleTitle;
      }

      return `${chapter.book.name} ${chapter.chapter.number} - ${chapter.translation.name} | ${seedBibleTitle}`;
    };

    return `${isRtl ? RTLE_CHAR : ""}${getTitle()}`;
  });

  const description = computed(() => {
    void i18n.language.value;
    const { t } = i18n;

    const getDescription = () => {
      if (!selectedTab.value) {
        return t("seed-bible", {
          defaultValue: "Seed Bible",
        });
      }

      const chapter = selectedTab.value.readingState.chapterData.value;
      if (!chapter) {
        return t("seed-bible", {
          defaultValue: "Seed Bible",
        });
      }

      return t("seed-bible-description", {
        bookName: chapter.book.name,
        chapterNumber: chapter.chapter.number,
        defaultValue: "Read {{bookName}} {{chapterNumber}} in the Seed Bible",
      });
    };

    return getDescription();
  });

  const siteName = computed(() => {
    void i18n.language.value;
    const { t } = i18n;

    return t("seed-bible", {
      defaultValue: "Seed Bible",
    });
  });

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

  const canonicalUrl = computed(() => {
    const currentUrl = navigation.currentUrl.value;

    const canonicalUrl = new URL("/", currentUrl);
    const chapter = selectedTab.value?.readingState.chapterData.value;

    if (chapter) {
      canonicalUrl.searchParams.set(
        "translation",
        data.buildTranslationId(chapter.translation.id)
      );
      canonicalUrl.searchParams.set("book", chapter.book.id);
      canonicalUrl.searchParams.set("chapter", String(chapter.chapter.number));
    }

    return `${canonicalUrl.pathname}${canonicalUrl.search}`;
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
    panes.setSelectedPaneTab(tabId);
  };

  const handleAddTab = () => {
    closeSidebarAndSettings();
    const targetPane =
      panes.panes.value.find(
        (pane) => pane.id === panes.selectedPaneId.value
      ) ??
      panes.panes.value.find((pane) => !pane.detached) ??
      panes.panes.value[0] ??
      null;

    if (!targetPane) {
      // No panes — fall back to plain tab creation.
      const tab = tabs.addTab();
      panes.setSelectedPaneTab(tab.id);
      return;
    }

    void selector.setOpen(true, targetPane, { forNewTab: true });
  };

  // Resolves which tab should be opened in a brand-new pane. A pane is bound to
  // a tab by id, and panes sharing a tab also share its reading state and get
  // de-duplicated into a single slot. So when the requested tab is already
  // displayed in a pane (the common case — it's the tab currently being read),
  // opening it again would either leave an empty pane or move both panes when
  // navigating chapters. To give the user an independent, navigable panel we
  // clone the tab into a fresh one seeded at the same reading location.
  const resolveTabForNewPane = (tabId: string): string => {
    const sourceTab = tabs.tabs.value.find((tab) => tab.id === tabId) ?? null;
    if (!sourceTab) {
      return tabId;
    }

    const alreadyShown = panes.panes.value.some(
      (pane) => pane.tab?.id === tabId
    );
    if (!alreadyShown) {
      return tabId;
    }

    const readingState = sourceTab.readingState;
    const clone = tabs.addTab(
      undefined,
      {
        initialTranslationId: readingState.translationId.value,
        initialBookId: readingState.bookId.value,
        initialChapterNumber: readingState.chapterNumber.value,
      },
      { paneOnly: true }
    );
    return clone.id;
  };

  const handleOpenInNewPane = (tabId: string) => {
    closeSidebarAndSettings();
    const paneTabId = resolveTabForNewPane(tabId);
    panes.openPane({
      type: "attached",
      tabId: paneTabId,
    });
    tabs.selectTab(paneTabId);
  };

  const handleOpenInDetachedPane = (tabId: string) => {
    closeSidebarAndSettings();
    const paneTabId = resolveTabForNewPane(tabId);
    panes.openPane({
      type: "detached",
      tabId: paneTabId,
    });
    tabs.selectTab(paneTabId);
  };

  const handleSelectPane = (paneId: string) => {
    closeSidebarAndSettings();
    panes.selectPane(paneId);

    const selectedPane =
      panes.panes.value.find((pane) => pane.id === paneId) ?? null;
    if (selectedPane?.tab) {
      tabs.selectTab(selectedPane.tab.id);
      return;
    }

    if (
      selectedPane?.component !== null ||
      selectedPane?.gridPortal !== null ||
      selectedPane?.mapPortal !== null
    ) {
      return;
    }

    selector.setOpen(true, selectedPane);
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
      const isHost =
        locallyHostedSessionIds.has(session.id) ||
        (hostUserId !== null &&
          (hostUserId === localId || hostUserId === localConnectionId));

      if (isHost && session.options.value.endedAt === null) {
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
  const sessionsWhereHostWasSeen = new Set<string>();
  const HOST_DISCONNECT_GRACE_MS = 8000;
  const pendingHostDisconnectTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  const clearPendingHostDisconnect = (sessionId: string) => {
    const timer = pendingHostDisconnectTimers.get(sessionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      pendingHostDisconnectTimers.delete(sessionId);
    }
  };
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

      const users = session.connectedUsers.value;
      const hostIsConnected = users.some(
        (user) => user.userId === hostId || user.connectionId === hostId
      );

      if (hostIsConnected) {
        sessionsWhereHostWasSeen.add(session.id);
        // Host came back (e.g. reconnected after their login flow) — cancel
        // any pending close so the tab survives the round-trip.
        clearPendingHostDisconnect(session.id);
      } else if (
        sessionsWhereHostWasSeen.has(session.id) &&
        !pendingHostDisconnectTimers.has(session.id)
      ) {
        // Host appears to have left, but it may be a transient reconnect
        // (host logging in/out) — wait briefly to give the CRDT time to
        // deliver a new `hostUserId` or for the host's connection to
        // re-appear before tearing down.
        const tabId = tab.id;
        const sessionId = session.id;
        const timer = setTimeout(() => {
          pendingHostDisconnectTimers.delete(sessionId);
          sessionsWhereHostWasSeen.delete(sessionId);
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
    const session = await sessions.createSession();
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
    panes.setSelectedPaneTab(tab.id);
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
    panes.setSelectedPaneTab(tab.id);
    return session;
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

  void setupInitialSession();

  // App-level toast: a single popup shown at the bottom of the screen for 3.5s.
  // A new call overwrites the current toast and restarts the timer, so only the
  // most recent message is ever visible. The incrementing id keys the render so
  // the slide-in animation replays even for a repeated message.
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

  const state: SeedBibleState = {
    os,
    bibleData: data,
    config,
    theme: {
      ...themeManager,
      themeCssVariables,
      themeCssClasses,
    },
    sidebar,
    tabs,
    panes,
    selector,
    tools,
    login,
    readingHistory,
    highlights,
    bookmarks,
    annotations,
    sessions,
    modals,
    settings,
    invitations,
    search,
    navigation,
    i18n,
    discover,
    extensions,
    readingPlans,
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
    app: {
      createSharedSession: handleCreateSharedSession,
      joinSharedSession: handleJoinSharedSession,
      panelsEnabled,
      selectedTab,
      effectivePanes,
      viewportWidth,
      viewportHeight,
      isMobile,
      isMobileLandscape,
      currentReadingState,
      selectTab: handleSelectTab,
      addTab: handleAddTab,
      openInNewPane: handleOpenInNewPane,
      openInDetachedPane: handleOpenInDetachedPane,
      selectPane: handleSelectPane,
      title,
      description,
      siteName,
      canonicalUrl,
      socialTitle,
      currentToast,
      toast,
    },
  };

  setupExtensionContext(state);

  return state;
}
