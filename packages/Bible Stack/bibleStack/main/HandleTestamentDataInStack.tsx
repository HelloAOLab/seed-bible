const {testamentData, desiredPositionZ, dimension, duration, easing, speedMultiplier = 1, isInstantaneous} = that;

let nextPositionZ = desiredPositionZ;
const newTestamentAnimations = [];

if(testamentData.isSplitIntoSections)
{
    nextPositionZ += BibleVizUtils.Data.tags.StackSpacing.BetweenSections;
    for(const sectionData of testamentData.childrenData)
    {
        if(sectionData.isActive)
        {
            const {sectionDeltaPositionZ, newSectionAnimations} = await thisBot.HandleSectionDataInStack({sectionData, desiredPositionZ: nextPositionZ, dimension, duration, easing, speedMultiplier, isInstantaneous})
            newTestamentAnimations.push(...newSectionAnimations);
            nextPositionZ += (sectionDeltaPositionZ + BibleVizUtils.Data.tags.StackSpacing.BetweenSections);
        }
    }
}
else
{
    if(testamentData.isActive)
    {
        setTag(testamentData.piece, "desiredPositionZ", nextPositionZ);
        if(isInstantaneous) setTagMask(testamentData.piece, dimension + "Z", nextPositionZ)
        else
        {
            newTestamentAnimations.push(animateTag(testamentData.piece, dimension + "Z", {
                toValue: nextPositionZ,
                duration,
                easing 
            }));
        }
        nextPositionZ += testamentData.piece.tags.desiredScaleZ;
    }
}
const testamentDeltaPositionZ = nextPositionZ - desiredPositionZ;
return {testamentDeltaPositionZ, newTestamentAnimations};