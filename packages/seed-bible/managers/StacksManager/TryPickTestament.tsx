if(thisBot.masks.isBibleAnimating) return false;
setTagMask(thisBot, 'isBibleAnimating', true);

const {testamentName} = that;
const testamentData = thisBot.vars.lastInteractedBibleData?.childrenData.find((currTestamentData) => {return currTestamentData.elementInfo.name === testamentName})
if( thisBot.vars.lastInteractedBibleData &&
    testamentData &&
    testamentData.isActive && !testamentData.isSplitIntoSections
)
{
    await thisBot.PickTestament({bibleData: thisBot.vars.lastInteractedBibleData, testamentName});
}
else
{
    await thisBot.SpawnBibleAndPickTestament({testamentName});
}

setTagMask(thisBot, 'isBibleAnimating', false);
return true;