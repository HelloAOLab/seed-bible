/**
 * This tag is returns the current sectionData with the isInExplodedView property set to true
 * @param {Object} that - Object that contains important data for the function
 * @param {StackBibleData} that.bibleData - The stack to search for the exploded view section
 * @example
 * const previousExplodedViewSectionData = thisBot.GetPreviousExplodedViewSectionData({stackData: someStackData});
 */

let { testamentData } = that;
const { bibleData } = that;
if (bibleData) {
  testamentData = bibleData.childrenData.find((currentTestamentData: any) => {
    return currentTestamentData.childrenData.some((sectionData: any) => {
      return sectionData.isInExplodedView;
    });
  });
}
if (testamentData) {
  return testamentData.childrenData.find((currentSectionData) => {
    return currentSectionData.isInExplodedView;
  });
}
return null;
