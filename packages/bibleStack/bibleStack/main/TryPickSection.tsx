if(thisBot.masks.isBibleAnimating) return false;
setTagMask(thisBot, 'isBibleAnimating', true);
const {testamentName, sectionName} = that;
const {found} = thisBot.BibleVizUtils.Functions.GetSectionInfoPathByName({name: sectionName});
if(found)
{
    const sectionData = thisBot.vars.lastInteractedStackTestamentData?.childrenData.find((currSectionData) => {return currSectionData.pieceInfo.name === sectionName})
    if( thisBot.vars.lastInteractedStackTestamentData &&
        thisBot.vars.lastInteractedStackTestamentData.isActive && 
        sectionData &&
        (!thisBot.vars.lastInteractedStackTestamentData.isSplitIntoSections || (sectionData.isActive && !sectionData.isSplitIntoBooks))
    )
    {
        if(!thisBot.vars.lastInteractedStackTestamentData.isSplitIntoSections) await thisBot.SelectTestament({testament: thisBot.vars.lastInteractedStackTestamentData.piece})
        await thisBot.PickSection({testamentData: thisBot.vars.lastInteractedStackTestamentData, sectionName})
    }
    else
    {
        await thisBot.SpawnTestamentAndPickSection({testamentName, sectionName});
    }
}

setTagMask(thisBot, 'isBibleAnimating', false);
return true;