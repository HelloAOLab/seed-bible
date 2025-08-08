/**
    * Creates a new pooled object for the given poolData
    * @param {Object} that - Object that contains important data for the function
    * @param {PoolData} that.poolData - The pool data to create the object
    * @example
    * ObjectPooler.CreateNewObject({poolData: new PoolData({
        tag: ObjectPoolTags.ConfettiParticle,
        bot: getBot(byTag("isBaseConfettiParticle", true)),
        customTags: [
            new CustomTag({name: "isBaseConfettiParticle", value: false}),
            new CustomTag({name: "isConfettiParticle", value: true}),
            new CustomTag({name: "poolTag", value: ObjectPoolTags.ConfettiParticle}),
        ],
        size: 50
    })});
*/

/** 
const {poolData} = that;
let obj;
const dimension = os.getCurrentDimension();

obj = create(poolData.bot, {
    space: "tempLocal",
    [dimension]: false
});
for(const tag of poolData.customTags)
{
    obj.tags[tag.name] = tag.value;
}

return obj;
*/