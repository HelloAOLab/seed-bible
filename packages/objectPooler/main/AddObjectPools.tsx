/**
    * Receives a tag and return the fisrt object of the pool that matches with that tag if it exists
    * @param {Object} that - Object that contains important data for the function
    * @param {String} that.tag - The tag that the pool should match with
    * @example
    * const obj = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.ConfettiParticle});
*/

import {Pool} from "interactiveBible.managers.ObjectPooler.Pool"

const {poolsData} = that;

for(const poolData of poolsData)
{
    if(thisBot.vars.poolDictionary[poolData.tag]) continue;

    const objectPool = Array.from({length: poolData.size}).map(() => { return thisBot.CreateNewObject({poolData}) });

    thisBot.vars.poolDictionary[poolData.tag] = new Pool(
        {
            poolData,
            objectPool,
            inUseObjects: []
        }
    )
}