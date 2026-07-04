/**
 * This tag is returns the current sectionData with the isInExplodedView property set to true
 * @param {Object} that - Object that contains important data for the function
 * @param {StackBibleData} that.bibleData - The stack to search for the exploded view section
 * @example
 * const previousExplodedViewSectionData = thisBot.GetPreviousExplodedViewSectionData({stackData: someStackData});
 */

import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";

let { testamentData }: { testamentData: StackTestamentData | undefined } = that;
const { bibleData }: { bibleData: StackBibleData | undefined } = that;
if (bibleData) {
  testamentData = bibleData.getTestamentWithExplodedSection();
}
if (testamentData) {
  const explodedSection = testamentData.findExplodedSection();
  return explodedSection;
}
return null;
