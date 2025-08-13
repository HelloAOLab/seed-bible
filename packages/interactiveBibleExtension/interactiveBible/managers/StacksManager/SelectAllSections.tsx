/**
 * Selects and highlights all sections and books within a BibleData's structure.
 * 
 * This function iterates through each testament and section in the BibleData. It ensures that sections are set into an "exploded view" 
 * (expanded) if they are split into books but not yet in the exploded view. If any changes are made, the bot updates its stacks.
 * 
 * The function also selects each active testament and section in reverse order, applying the necessary animations.
 * 
 * @param {Object} that - Contains bibleData which holds the structure of testaments and sections to be processed.
 * @param {BibleData} that.bibleData - The bible data which will be iterated to select all the sections.
 * 
 * @returns {Promise<void>} - Returns a promise that resolves when all the selections and animations complete.
 * 
 * @example
 * StacksManager.SelectAllSections({bibleData: someBibleData});
 */

import {SectionBookData} from "interactiveBible.managers.StacksManager.SectionBookData"

const {bibleData, isInstantaneous = false} = that;
let callUpdateStacks = false;
bibleData.childrenData.forEach((testamentData) => {
    testamentData.childrenData.forEach((sectionData) => {
        if(sectionData.isSplitIntoBooks && !sectionData.isInExplodedView)
        {
            sectionData.isInExplodedView = true;
            callUpdateStacks = true;
        }
    })
})
if(callUpdateStacks) await thisBot.UpdateStacks({isInstantaneous, speedMultiplier: thisBot.tags.speedMultiplier});

for(let testamentData of bibleData.childrenData.toReversed())
{
    if(testamentData.isActive && !testamentData.isSplitIntoSections)
    {
        await thisBot.SelectTestament({bibleData, testament: testamentData.element, speedMultiplier: thisBot.tags.speedMultiplier, isInstantaneous});
    }
    for(let sectionData of testamentData.childrenData.toReversed())
    {
        if(!(sectionData instanceof SectionBookData))
        {
            if(sectionData.isSplitIntoBooks)
            {
                if(!sectionData.isInExplodedView)
                {
                    await thisBot.TrySetSectionAsExplodedView({section: sectionData.element, setBibleAnimating: false, speedMultiplier: thisBot.tags.speedMultiplier, isInstantaneous})
                }
            }
            else
            {
                await thisBot.SelectSection({bibleData, section: sectionData.element, speedMultiplier: thisBot.tags.speedMultiplier, isInstantaneous});
            }
        }
    }
}