const {name} = that;
const {arrangementIndex, testamentIndex, sectionIndex, found} = thisBot.GetSectionInfoPathByName({name});
if(found)
{
    return InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex].books.map((currBook) => {return currBook.commonName})
}
return null;