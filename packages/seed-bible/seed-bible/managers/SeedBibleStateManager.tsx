import { setupExtensionContext } from "seed-bible.app.api";
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
} from "seed-bible.managers.ThemeManager";
import type { ThemeManager } from "seed-bible.managers.ThemeManager";
import { computed, effect, type ReadonlySignal } from "@preact/signals";
import {
  createReadingHistoryManager,
  type ReadingHistoryManager,
} from "seed-bible.managers.ReadingHistoryManager";
import {
  createExtensionManager,
  type ExtensionManager,
} from "seed-bible.managers.ExtensionManager";
import { debounce } from "es-toolkit";

type SidebarManager = ReturnType<typeof createSidebar>;

export interface AppState {
  panelsEnabled: ReadonlySignal<boolean>;
  selectedTab: ReadonlySignal<ReaderTab | null>;
  effectivePanes: ReadonlySignal<Pane[]>;

  currentReadingState: ReadonlySignal<{
    tab: ReaderTab;

    translationId: string | null;
    bookId: string | null;
    chapterNumber: number | null;
  } | null>;

  selectTab: (tabId: string) => void;
  addTab: () => void;
  openInNewPane: (tabId: string) => void;
  openInDetachedPane: (tabId: string) => void;
  selectPane: (paneId: string) => void;
}

export interface SeedBibleState {
  bibleData: BibleDataManager;
  config: ConfigManager;
  theme: ThemeManager & {
    themeCssVariables: ReadonlySignal<string>;
  };
  sidebar: SidebarManager;
  tabs: TabsManager;
  panes: PanesManager;
  selector: BibleSelectorState;
  tools: ToolsManager;
  login: LoginManager;
  readingHistory: ReadingHistoryManager;
  app: AppState;
  extensions: ExtensionManager;
}

export function createSeedBibleState(): SeedBibleState {
  const api = new FreeUseBibleAPI();
  const data = createBibleDataManager(api);
  const config = createConfig();
  const themeManager = createTheme();
  const sidebar = createSidebar();
  const tabs = createTabs(data);
  const panes = createPanes(tabs, tabs.selectedTabId);
  const selector = createBibleSelectorState(data, tabs, panes);
  const tools = createBibleToolsManager();
  const login = createLoginManager();
  const readingHistory = createReadingHistoryManager(login);
  const extensions = createExtensionManager();

  const { currentTheme } = themeManager;
  const theme = computed(() => currentTheme.value.variables);
  const themeCssVariables = computed(() =>
    generateThemeCssVariables(theme.value)
  );
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

  const state: SeedBibleState = {
    bibleData: data,
    config,
    theme: {
      ...themeManager,
      themeCssVariables,
    },
    sidebar,
    tabs,
    panes,
    selector,
    tools,
    login,
    readingHistory,
    extensions,
    app: {
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

export { I18nProvider } from "seed-bible.i18n.I18nManager";
