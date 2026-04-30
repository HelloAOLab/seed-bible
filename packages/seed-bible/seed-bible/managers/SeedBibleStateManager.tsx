import { createBibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import {
  createBibleDataManager,
  type BibleDataManager,
} from "seed-bible.managers.BibleDataManager";
import { createBibleToolsManager } from "seed-bible.managers.BibleToolsManager";
import type { ToolsManager } from "seed-bible.managers.BibleToolsManager";
import { createConfig } from "seed-bible.managers.ConfigManager";
import type { ConfigManager } from "seed-bible.managers.ConfigManager";
import { FreeUseBibleAPI } from "seed-bible.managers.FreeUseBibleAPI";
import { createPanes } from "seed-bible.managers.PanesManager";
import type { Pane, PanesManager } from "seed-bible.managers.PanesManager";
import { createLoginManager } from "seed-bible.managers.LoginManager";
import type { LoginManager } from "seed-bible.managers.LoginManager";
import { createSidebar } from "seed-bible.managers.SidebarManager";
import { createTabs } from "seed-bible.managers.TabsManager";
import type { ReaderTab, TabsManager } from "seed-bible.managers.TabsManager";
import {
  generateThemeCssVariables,
  createTheme,
  generateThemeCssClasses,
} from "seed-bible.managers.ThemeManager";
import type { ThemeManager } from "seed-bible.managers.ThemeManager";
import { computed, effect, type ReadonlySignal } from "@preact/signals";
import {
  createReadingHistoryManager,
  type ReadingHistoryManager,
} from "seed-bible.managers.ReadingHistoryManager";
import {
  createExtensionManager,
  setupExtensionContext,
  type ExtensionManager,
} from "seed-bible.managers.ExtensionManager";
import {
  createHighlightsManager,
  type HighlightsManager,
} from "seed-bible.managers.HighlightsManager";
import {
  createSessionsManager,
  type BibleReadingSession,
  type SessionsManager,
} from "seed-bible.managers.SessionsManager";
import {
  createAnnotationsManager,
  type AnnotationsManager,
} from "seed-bible.managers.AnnotationsManager";
import {
  createModalManager,
  type ModalManager,
} from "seed-bible.managers.ModalManager";
import { createSearchManager } from "seed-bible.managers.SearchManager";

type SidebarManager = ReturnType<typeof createSidebar>;
type SearchManager = ReturnType<typeof createSearchManager>;

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
}

/**
 * Root state container for Seed Bible.
 *
 * This object aggregates all domain managers plus app-level computed state so
 * components can consume one consistent source of truth.
 */
export interface SeedBibleState {
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
  /** Annotation manager for notes/metadata. */
  annotations: AnnotationsManager;
  /** Shared reading sessions manager. */
  sessions: SessionsManager;
  /** Modal manager for app-wide dialog state and rendering. */
  modals: ModalManager;
  /** Search manager for Typesense-backed queries. */
  search: SearchManager;
  /** Aggregated computed app state and top-level UI actions. */
  app: AppState;
  /** Extension loading and runtime manager. */
  extensions: ExtensionManager;
}

/**
 * Creates and wires the full Seed Bible application state graph.
 *
 * Manager dependencies are initialized in order, then composed into derived
 * signals/actions that power the UI. The resulting state is also passed to
 * extension context setup.
 */
export function createSeedBibleState(): SeedBibleState {
  const api = new FreeUseBibleAPI();
  const data = createBibleDataManager(api);
  const login = createLoginManager();
  const highlights = createHighlightsManager(login);
  const config = createConfig(login);
  const themeManager = createTheme();
  const sidebar = createSidebar();
  const tabs = createTabs(data, highlights);
  const panes = createPanes(tabs, tabs.selectedTabId);
  const selector = createBibleSelectorState(data, tabs, panes);
  const tools = createBibleToolsManager();
  const readingHistory = createReadingHistoryManager(login);
  const annotations = createAnnotationsManager(login);
  const sessions = createSessionsManager(data, login, highlights);
  const extensions = createExtensionManager();
  const modals = createModalManager();
  const search = createSearchManager();

  const { currentTheme } = themeManager;
  const theme = computed(() => currentTheme.value);
  const themeCssVariables = computed(() =>
    generateThemeCssVariables(theme.value)
  );
  const themeCssClasses = computed(() => generateThemeCssClasses(theme.value));
  const panelsEnabled = computed(() => !config.config.value.disablePanels);
  const selectedTab = computed(
    () =>
      tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null
  );
  const effectivePanes = computed(() =>
    panelsEnabled.value
      ? panes.panes.value
      : selectedTab.value
        ? [
            {
              id: "single-pane",
              tab: selectedTab.value,
              component: null,
              gridPortal: null,
              mapPortal: null,
              detached: false,
              detachedAnchor: "floating" as const,
              x: 0,
              y: 0,
              width: 0,
              height: 0,
            },
          ]
        : []
  );
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

  effect(() => {
    if (!selectedTab.value) {
      return;
    }

    const chapter = selectedTab.value.readingState.chapterData.value;
    if (!chapter) {
      return;
    }

    const RTLE_CHAR = "\u202B";
    configBot.tags.pageTitle = `${chapter.translation.textDirection === "rtl" ? RTLE_CHAR : ""}${chapter.book.name} ${chapter.chapter.number} - ${chapter.translation.name} | Seed Bible`;

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

  effect(() => {
    const urlEncodedEndpoint = configBot.tags?.endpoint;
    if (urlEncodedEndpoint) {
      const decodedEndpoint = decodeURIComponent(urlEncodedEndpoint);
      console.log("Setting API endpoint from config tag:", decodedEndpoint);
      data.getTranslations(decodedEndpoint).then((translations) => {
        const translationId =
          configBot.tags.translation ??
          configBot.tags.translationId ??
          translations[0]?.id;
        if (translationId) {
          panes.panes.value[0]?.tab?.readingState.selectTranslation(
            translationId
          );
        }
      });
      configBot.tags.endpoint = null;
    }
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
    const tab = tabs.addTab();
    panes.setSelectedPaneTab(tab.id);
  };

  const handleOpenInNewPane = (tabId: string) => {
    closeSidebarAndSettings();
    panes.openPane({
      type: "attached",
      tabId,
    });
    tabs.selectTab(tabId);
  };

  const handleOpenInDetachedPane = (tabId: string) => {
    closeSidebarAndSettings();
    panes.openPane({
      type: "detached",
      tabId,
    });
    tabs.selectTab(tabId);
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

  const handleCreateSharedSession = async () => {
    closeSidebarAndSettings();
    const session = await sessions.createSession();
    const tab = tabs.addTab(session);
    panes.setSelectedPaneTab(tab.id);
    return session;
  };

  const handleJoinSharedSession = async (id: string) => {
    closeSidebarAndSettings();
    const session = await sessions.joinSession(id);
    const tab = tabs.addTab(session);
    panes.setSelectedPaneTab(tab.id);
    return session;
  };

  const state: SeedBibleState = {
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
    annotations,
    sessions,
    modals,
    search,
    extensions,
    app: {
      createSharedSession: handleCreateSharedSession,
      joinSharedSession: handleJoinSharedSession,
      panelsEnabled,
      selectedTab,
      effectivePanes,
      currentReadingState,
      selectTab: handleSelectTab,
      addTab: handleAddTab,
      openInNewPane: handleOpenInNewPane,
      openInDetachedPane: handleOpenInDetachedPane,
      selectPane: handleSelectPane,
    },
  };

  setupExtensionContext(state);

  return state;
}
