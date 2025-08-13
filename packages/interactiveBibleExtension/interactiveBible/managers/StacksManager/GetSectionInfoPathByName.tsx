/**
    * Searches for the path of a section based on its name, returning the arrangement, testament, and section details.
    *
    * @param {Object} that - The context object containing the section's name.
    * @param {string} that.name - The name of the section to find.
    * @returns {Object} - An object containing the indices of the arrangement, testament, and the section key where the section was found, and a boolean indicating whether it was found.
    * @returns {number} returns.arrangementIndex - The index of the arrangement containing the section.
    * @returns {number} returns.testamentIndex - The index of the testament containing the section.
    * @returns {string} returns.sectionIndex - The name of the section.
    * @returns {boolean} returns.found - Whether the section was found.
    * @example
    * const {arrangementIndex, testamentIndex, sectionIndex, found} = thisBot.GetSectionInfoPathByName({name: "Law"});
*/

const {name} = that;
let arrangementIndex = thisBot.GetCurrentArrangementIndex();
const initialArrangementIndex = arrangementIndex;
let testamentIndex, sectionIndex;
let found = false;

for(let currentTestamentIndex in InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments)
{
    const testamentInfo = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[currentTestamentIndex];
    if(testamentInfo.sections.some((sectionInfo) => {return sectionInfo.name === name}))
    {
        testamentIndex = currentTestamentIndex;
        sectionIndex = testamentInfo.sections.findIndex((sectionInfo) => {return sectionInfo.name === name})
        found = true;
        break;
    }
}
if(!found)
{
    for(let currentArrangementIndex in InstanceManager.vars.fixedArrangementsInfo)
    {
        if(currentArrangementIndex == initialArrangementIndex) continue;
        for(let currentTestamentIndex in InstanceManager.vars.fixedArrangementsInfo[currentArrangementIndex].testaments)
        {
            const testamentInfo = InstanceManager.vars.fixedArrangementsInfo[currentArrangementIndex].testaments[currentTestamentIndex];
            if(testamentInfo.sections.some((sectionInfo) => {return sectionInfo.name === name}))
            {
                arrangementIndex = currentArrangementIndex;
                testamentIndex = currentTestamentIndex;
                sectionIndex = testamentInfo.sections.findIndex((sectionInfo) => {return sectionInfo.name === name})
                found = true;
                break;
            }
        }
    }
}
return {arrangementIndex, testamentIndex, sectionIndex, sectionName: name, found};