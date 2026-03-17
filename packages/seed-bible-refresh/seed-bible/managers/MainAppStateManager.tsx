import { setupExtensionContext } from "seed-bible.app.api";
import { useBibleSelector } from "seed-bible.managers.BibleSelectorManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import { useBibleToolsManager } from "seed-bible.managers.BibleToolsManager";
import type { ToolsManager } from "seed-bible.managers.BibleToolsManager";
import { useConfig } from "seed-bible.managers.ConfigManager";
import type { ConfigManager } from "seed-bible.managers.ConfigManager";
import { FreeUseBibleAPI } from "seed-bible.managers.FreeUseBibleAPI";
import { usePanes } from "seed-bible.managers.PanesManager";
import type { Pane, PanesManager } from "seed-bible.managers.PanesManager";
import { useSidebar } from "seed-bible.managers.SidebarManager";
import { useTabs } from "seed-bible.managers.TabsManager";
import type { ReaderTab, TabsManager } from "seed-bible.managers.TabsManager";
import {
  generateThemeCssVariables,
  useTheme,
} from "seed-bible.managers.ThemeManager";
import type {
  BibleThemeVariables,
  ThemeManager,
} from "seed-bible.managers.ThemeManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import type { I18nManager } from "seed-bible.i18n.I18nManager";

const { useEffect, useMemo } = os.appHooks;

type SidebarManager = ReturnType<typeof useSidebar>;

export interface MainAppState {
  api: FreeUseBibleAPI;
  config: ConfigManager;
  theme: ThemeManager & {
    theme: BibleThemeVariables;
    themeCssVariables: string;
  };
  sidebar: SidebarManager;
  tabs: TabsManager;
  panes: PanesManager;
  selector: BibleSelectorState;
  tools: ToolsManager;
  i18n: I18nManager;
  derived: {
    panelsEnabled: boolean;
    selectedTab: ReaderTab | null;
    effectivePanes: Pane[];
  };
  handlers: {
    selectTab: (tabId: string) => void;
    addTab: () => void;
    openInNewPane: (tabId: string) => void;
    openInDetachedPane: (tabId: string) => void;
    selectPane: (paneId: string) => void;
  };
}

export function useMainAppState(): MainAppState {
  const api = useMemo(() => new FreeUseBibleAPI(), []);
  const config = useConfig();
  const themeManager = useTheme();
  const sidebar = useSidebar();
  const tabs = useTabs(api);
  const panes = usePanes(tabs, tabs.selectedTabId.value);
  const selector = useBibleSelector(api, tabs, panes);
  const tools = useBibleToolsManager();
  const i18n = useI18n();

  const { currentTheme } = themeManager;
  const theme = currentTheme.variables;
  const themeCssVariables = generateThemeCssVariables(theme);

  const panelsEnabled = !config.config.value.disablePanels;
  const selectedTab =
    tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null;
  const effectivePanes: Pane[] = panelsEnabled
    ? panes.panes.value
    : selectedTab
      ? [
          {
            id: "single-pane",
            tab: selectedTab,
            component: null,
            detached: false,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
          },
        ]
      : [];

  useEffect(() => {
    panes.setSelectedPaneTab(tabs.selectedTabId.value);
  }, [tabs.selectedTabId.value]);

  useEffect(() => {
    setupExtensionContext({
      api,
      panes,
      tabs,
      selector,
      config,
      theme: themeManager,
      i18n,
      tools,
    });
  }, [api, panes, tabs, selector, config, themeManager, i18n, tools]);

  const closeSidebarAndSettings = () => {
    sidebar.closeSettings();
    sidebar.closeSidebar();
  };

  const handleSelectTab = (tabId: string) => {
    closeSidebarAndSettings();
    tabs.selectTab(tabId);
  };

  const handleAddTab = () => {
    closeSidebarAndSettings();
    tabs.addTab();
  };

  const handleOpenInNewPane = (tabId: string) => {
    closeSidebarAndSettings();
    panes.openInNewPane(tabId);
    tabs.selectTab(tabId);
  };

  const handleOpenInDetachedPane = (tabId: string) => {
    closeSidebarAndSettings();
    panes.openInDetachedPane(tabId);
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

    if (selectedPane?.component !== null) {
      return;
    }

    selector.setOpen(true, selectedPane);
  };

  return {
    api,
    config,
    theme: {
      ...themeManager,
      theme,
      themeCssVariables,
    },
    sidebar,
    tabs,
    panes,
    selector,
    tools,
    i18n,
    derived: {
      panelsEnabled,
      selectedTab,
      effectivePanes,
    },
    handlers: {
      selectTab: handleSelectTab,
      addTab: handleAddTab,
      openInNewPane: handleOpenInNewPane,
      openInDetachedPane: handleOpenInDetachedPane,
      selectPane: handleSelectPane,
    },
  };
}

export { I18nProvider } from "seed-bible.i18n.I18nManager";
