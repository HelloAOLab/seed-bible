const {activeTab, tabs} = that;

thisBot.vars.tabsContext = that;

thisBot.UserPresenceUpdate();
thisBot.UpdateStackTabsVisualization({source: "OnTabsContextChanged"});