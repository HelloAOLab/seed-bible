const {activeTab, tabs} = that;

thisBot.vars.tabsContext = that;

console.log(`[Debug] OnTabsContextChanged`, {tabsContext: thisBot.vars.tabsContext})

thisBot.UserPresenceUpdate();
thisBot.UpdateStackTabsVisualization({source: "OnTabsContextChanged"});