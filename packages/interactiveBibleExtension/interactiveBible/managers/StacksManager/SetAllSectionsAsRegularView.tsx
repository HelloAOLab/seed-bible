/**
 * Sets all sections of a given BibleData structure to regular view (non-exploded).
 * 
 * This function iterates through each testament and section in the Bible data and sets their view state to regular, 
 * meaning the sections will not be displayed in "exploded view" (expanded). Sections that are instances of `SectionBookData` 
 * are excluded from this operation.
 * 
 * @param {Object} that - Contains bibleData, which holds the structure of testaments and sections to be processed.
 * @param {BibleData} that.bibleData - The BibleData which structure will be iterated.
 * 
 * @example
 * StacksManager.SetAllSectionsAsRegularView({bibleData: someBibleData});
 */

import {SectionBookData} from "interactiveBible.managers.StacksManager.SectionBookData"
const {bibleData} = that;
for(let testamentData of bibleData.childrenData)
{
    for(let sectionData of testamentData.childrenData)
    {
        if(!(sectionData instanceof SectionBookData)) sectionData.isInExplodedView = false;
    }
}