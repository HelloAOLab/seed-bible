import type { TabsManager } from "ext_discover.interfaces.managers.TabsManager";

export interface TabsProps {
  tabs: string[];
  onTabChange: (tab: string) => void;
  scope?: string;
  manager?: TabsManager;
}
