const {name} = that;
const {arrangementIndex, testamentIndex, found} = thisBot.GetTestamentInfoPathByName({name});
if(found)
{
    return Object.keys(InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections);
}
return null;