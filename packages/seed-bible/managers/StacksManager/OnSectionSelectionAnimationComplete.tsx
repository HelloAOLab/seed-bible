/**
    * Called whenever a section has completed its selection animation
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.sectionData - The section data of the section that has been selected
    * @example
    * shout("OnSectionSelectionAnimationComplete", {sectionData})
*/

const {sectionData, speedMultiplier = 1, isInstantaneous = false} = that;
// if(thisBot.HasSectionEverBeenSelected({sectionData}))
// {
    await thisBot.UpdateStacks({speedMultiplier, isInstantaneous});
    setTagMask(thisBot, "isBibleAnimating", false);
    thisBot.UpdateStackElementsUsersNotification();
    return true;
// }
// else
// {
//     return thisBot.TryMakeTourGuideOnSection({sectionData});
// }