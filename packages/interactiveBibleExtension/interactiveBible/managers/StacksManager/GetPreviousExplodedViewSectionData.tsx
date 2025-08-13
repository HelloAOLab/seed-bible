/**
    * This tag is returns the current sectionData with the isInExplodedView property set to true
    * @param {Object} that - Object that contains important data for the function
    * @param {BibleData} that.bibleData - The stack to search for the exploded view section
    * @example
    * const previousExplodedViewSectionData = thisBot.GetPreviousExplodedViewSectionData({stackData: someStackData});
*/

let {testamentData} = that;
const {bibleData} = that;
if(bibleData)
{
    testamentData = bibleData.childrenData.find((currentTestamentData) => {
        return currentTestamentData.childrenData.some((sectionData) => {return sectionData.isInExplodedView})
    })
}
if(testamentData)
{
    return testamentData.childrenData.find((currentSectionData) => {
        return currentSectionData.isInExplodedView
    })
}
return null;