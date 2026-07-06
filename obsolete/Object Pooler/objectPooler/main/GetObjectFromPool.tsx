/**
 * Receives a tag and return the fisrt object of the pool that matches with that tag if it exists
 * @param {Object} that - Object that contains important data for the function
 * @param {String} that.tag - The tag that the pool should match with
 * @param {Number} that.amount? - (Optional) The amount of objects to get from the pool
 * @example
 * ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.ConfettiParticle});
 * ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.Chapter, amount: 20});
 */

const { tag, amount } = that;
let obj;

if ((!tag) in thisBot.vars.poolDictionary) {
  console.warning(`Pool with tag ${tag} doesn't exists.`);
  return null;
}

if (amount && amount > 1) {
  const objects = [];
  for (let i = 0; i < amount; i++) {
    obj = GetObject();
    objects.push(obj);
  }
  return objects;
} else {
  obj = GetObject();
  return obj;
}

function GetObject() {
  let objectToReturn;
  if (thisBot.vars.poolDictionary[tag].objectPool.length !== 0) {
    objectToReturn = thisBot.vars.poolDictionary[tag].objectPool.shift();
  } else {
    objectToReturn = thisBot.CreateNewObject({
      poolData: thisBot.vars.poolDictionary[tag].poolData,
    });
  }

  setTag(objectToReturn, "isInUse", true);
  thisBot.vars.poolDictionary[tag].inUseObjects.push(objectToReturn);
  return objectToReturn;
}
