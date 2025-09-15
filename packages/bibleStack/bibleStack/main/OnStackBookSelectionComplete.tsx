const {book} = that;

const activeTab = thisBot.vars.tabsContext.tabs.find((tab) => {return tab.id === thisBot.vars.tabsContext.activeTab});

if(activeTab)
{
    const isAtiveTabBook = activeTab.data.book == book.tags.bookName;

    if(isAtiveTabBook) thisBot.UpdateStackTabsVisualization({source: "OnStackBookSelectionComplete"});
}
