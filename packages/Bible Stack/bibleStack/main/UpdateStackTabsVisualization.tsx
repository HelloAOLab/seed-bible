const activeTab = thisBot.vars.tabsContext.tabs.find((tab) => {return tab.id === thisBot.vars.tabsContext.activeTab});

if(activeTab)
{
    const dimension = os.getCurrentDimension();
    const chaptersToSelect = [];
    const chaptersToDeselect = [];

    thisBot.vars.stackChaptersData.forEach((chapterData) => {
        if(chapterData.piece && chapterData.piece.tags.isInUse && chapterData.piece.tags[dimension] == true && !chapterData.piece.masks.isOnTheGround)
        {
            const book = chapterData.piece.tags.parentBookName;
            const chapter = chapterData.pieceInfo.number;
            if(chapterData.isSelected)
            {
                if(activeTab.data.book != book || activeTab.data.chapter != chapter)
                {
                    chaptersToDeselect.push(chapterData);
                }
            }
            else
            {
                if(activeTab.data.book == book && activeTab.data.chapter == chapter)
                {
                    chaptersToSelect.push(chapterData);
                }
            }
        }
    })
    
    return Promise.all(
        chaptersToSelect.length > 0 ? thisBot.TrySelectChapter({info: chaptersToSelect.map((chapterData) => { return {chapterData} })}) : null,
        chaptersToDeselect.length > 0 ? thisBot.DeselectChapter({info: chaptersToDeselect.map((chapterData) => { return {chapterData }})}) : null
    )
}