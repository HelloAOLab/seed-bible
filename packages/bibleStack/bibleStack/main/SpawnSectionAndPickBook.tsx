/**
 * Spawns a section, selects it, and then ejects a specific book from the section.
 * 
 * @param {Object} that - Object containing the section and book information.
 * @param {string} that.sectionName - The name of the section to spawn.
 * @param {number} that.bookName - The name of the book to eject.
 * 
 * @returns {Promise<void>} - A promise that resolves when the section is spawned, selected, and the book is ejected.
 * 
 * @example
 * thisBot.SpawnSectionAndPickBook({ sectionName: "Law", bookName: "Genesis" });
 */

const {sectionName, bookName} = that;
const {arrangementIndex, testamentIndex, sectionIndex, found} = thisBot.BibleVizUtils.Functions.GetSectionInfoPathByName({name: sectionName});
if(found && BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex].books.length > 1)
{
    const {sectionData} = await thisBot.SpawnSection({name: sectionName});
    await thisBot.SelectSection({section: sectionData.piece});
    await thisBot.PickBook({sectionData: sectionData, bookName});
}