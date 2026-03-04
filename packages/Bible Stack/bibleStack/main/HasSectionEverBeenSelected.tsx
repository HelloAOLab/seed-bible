/**
    * Returns true if the section has ever been selected, otherwise return false
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.sectionData - The section data to be checked
    * @example
    * thisBot.HasSectionEverBeenSelected({sectionData});
*/

const {sectionData} = that;

if(thisBot.vars.sectionNamesEverSelected.includes(sectionData.piece.tags.sectionName))
{
    return true;
}
else
{
    return false;
}