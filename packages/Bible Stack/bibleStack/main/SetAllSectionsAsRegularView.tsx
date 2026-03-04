/**
 * Sets all sections of a given StackBibleData structure to regular view (non-exploded).
 *
 * This function iterates through each testament and section in the Bible data and sets their view state to regular,
 * meaning the sections will not be displayed in "exploded view" (expanded). Sections that are instances of `StackSectionBookData`
 * are excluded from this operation.
 *
 * @param {Object} that - Contains bibleData, which holds the structure of testaments and sections to be processed.
 * @param {StackBibleData} that.bibleData - The StackBibleData which structure will be iterated.
 *
 * @example
 * thisBot.SetAllSectionsAsRegularView({bibleData: someBibleData});
 */

const { bibleData } = that;
for (const testamentData of bibleData.childrenData) {
  for (const sectionData of testamentData.childrenData) {
    if (!(sectionData instanceof StackSectionBookData))
      sectionData.isInExplodedView = false;
  }
}
