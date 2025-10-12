/**
    * This tag release an in use object and returns it to its respective object pool
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot | Bot[]} that.obj - The object or array of objects to be released
    * @param {tag} that.string - The tag of the pool to which the obj belongs to
    * @example
    * ObjectPooler.ReleaseObject({obj: thisBot, tag: thisBot.tags.poolTag});
*/

const {obj, tag, log = false} = that;
const dimension = os.getCurrentDimension();

if(Array.isArray(obj))
{
    const releasedObjects = [];
    for(const bot of obj)
    {
        const inUseObject = thisBot.vars.poolDictionary[tag].inUseObjects.find((activeObject) => {return activeObject.id === bot.id});

        if(inUseObject)
        {
            bot.OnReleased?.();
            clearTagMasks(bot);
            clearAnimations(bot);
            setTag(bot, dimension, false);
            setTag(bot, "isInUse", false);
            const idx = thisBot.vars.poolDictionary[tag].inUseObjects.indexOf(inUseObject);
            thisBot.vars.poolDictionary[tag].inUseObjects.splice(idx, 1);
            thisBot.vars.poolDictionary[tag].objectPool.push(inUseObject);
            releasedObjects.push(inUseObject);
        }
    }
    if(releasedObjects.length > 0)
    {
        return true;
    }
}
else
{
    const inUseObject = thisBot.vars.poolDictionary[tag].inUseObjects.find((activeObject) => {return activeObject.id === obj.id});

    if(inUseObject)
    {
        clearAnimations(obj);
        clearTagMasks(obj);
        obj.OnReleased?.();
        setTag(obj, dimension, false);
        setTag(obj, "isInUse", false);
        const idx = thisBot.vars.poolDictionary[tag].inUseObjects.indexOf(inUseObject);
        thisBot.vars.poolDictionary[tag].inUseObjects.splice(idx, 1);
        thisBot.vars.poolDictionary[tag].objectPool.push(inUseObject);
        return true;
    }
}

return false;