import { TAB_STYLES } from "ext_discover.models.tabs";
import { getTabsManager } from "ext_discover.managers.TabsManager";
import type { TabsProps } from "ext_discover.interfaces.components.Tabs";

export function Tabs({
  tabs,
  onTabChange,
  scope = "default",
  manager = getTabsManager(scope, tabs[0] ?? ""),
}: TabsProps) {
  const activeTab = manager.activeTab.value;

  return (
    <div style={TAB_STYLES.tabsContainer}>
      {tabs.map((tab, index) => (
        <div
          key={index}
          style={{
            ...TAB_STYLES.tab,
            ...(activeTab === tab ? TAB_STYLES.activeTab : {}),
            width: `${100 / tabs.length}%`,
          }}
          onClick={() => manager.handleTabClick(tab, onTabChange)}
        >
          {tab}
        </div>
      ))}
    </div>
  );
}
