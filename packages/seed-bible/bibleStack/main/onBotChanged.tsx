const {tags: changedTags} = that;
if(changedTags.includes("isBibleAnimating"))
{
    if(!thisBot.masks.isBibleAnimating && thisBot.masks.isTabVizUpdateQueued)
    {
        thisBot.UpdateStackTabsVisualization({source: "onBotChanged"});
    }
}