import type { Signal } from "@preact/signals";

export interface TabsManager {
  activeTab: Signal<string>;
  setActiveTab: (value: string) => void;
  handleTabClick: (tab: string, onTabChange: (tab: string) => void) => void;
}
