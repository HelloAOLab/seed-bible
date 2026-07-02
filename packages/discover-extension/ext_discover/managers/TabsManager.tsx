import { signal } from "@preact/signals";
import type { TabsManager } from "ext_discover.interfaces.managers.TabsManager";

const managersByScope = new Map<string, TabsManager>();

export function getTabsManager(scope: string, initialTab: string): TabsManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createTabsManager(initialTab);
  managersByScope.set(scope, manager);
  return manager;
}

export function createTabsManager(initialTab: string): TabsManager {
  const activeTab = signal(initialTab);

  const setActiveTab = (value: string) => {
    activeTab.value = value;
  };

  const handleTabClick = (tab: string, onTabChange: (tab: string) => void) => {
    setActiveTab(tab);
    onTabChange(tab);
  };

  return {
    activeTab,
    setActiveTab,
    handleTabClick,
  };
}
