if(thisBot.masks.isBibleAnimating) return false;
setTagMask(thisBot, 'isBibleAnimating', true);
const {testamentName, sectionName} = that;
const {found} = thisBot.GetSectionInfoPathByName({name: sectionName});
if(found)
{
    const sectionData = thisBot.vars.lastInteractedTestamentData?.childrenData.find((currSectionData) => {return currSectionData.elementInfo.name === sectionName})
    if( thisBot.vars.lastInteractedTestamentData &&
        thisBot.vars.lastInteractedTestamentData.isActive && 
        sectionData &&
        (!thisBot.vars.lastInteractedTestamentData.isSplitIntoSections || (sectionData.isActive && !sectionData.isSplitIntoBooks))
    )
    {
        if(!thisBot.vars.lastInteractedTestamentData.isSplitIntoSections) await thisBot.SelectTestament({testament: thisBot.vars.lastInteractedTestamentData.element})
        await thisBot.PickSection({testamentData: thisBot.vars.lastInteractedTestamentData, sectionName})
    }
    else
    {
        await thisBot.SpawnTestamentAndPickSection({testamentName, sectionName});
    }
}

setTagMask(thisBot, 'isBibleAnimating', false);
return true;