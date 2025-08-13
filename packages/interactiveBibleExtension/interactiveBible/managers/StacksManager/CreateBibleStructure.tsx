/**
    * Creates every element of a regular Bible structure for the given bibleData based on a given arrangement index.
    * @param {Object} that - Object that contains important data for the function
    * @param {Number} that.arrangementIndex - The index of the arrangement from which the Bible stack will be created
    * @param {BibleData} that.bibleData - The BibleData to which the structure will be added
    * @example
    * const {testamentsData, staticBibleElements} = await StacksManager.CreateBibleStructure({arrangementIndex: StacksManager.GetCurrentArrangementIndex(), bibleData: someBibleData});
*/

const {arrangementIndex, bibleData} = that;
const testamentsData = [];
const bibleTransformer = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.BibleTransformer});
const bibleTransformerMod = {bibleId: bibleData.id};
const upperCover = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.Cover});
const upperCoverMod = {bibleId: bibleData.id};
const leftCover = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.Cover});
const leftCoverMod = {bibleId: bibleData.id};
const lowerCover = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.Cover});
const lowerCoverMod = {bibleId: bibleData.id};
const crossVerticalLine = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.CrossLine});
const crossVerticalLineMod = {bibleId: bibleData.id};
const crossHorizontalLine = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.CrossLine});
const crossHorizontalLineMod = {bibleId: bibleData.id};
const bibleShadow = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.BibleShadow});
const bibleShadowMod = {bibleId: bibleData.id};

bibleTransformer.OnSpawned({mod: bibleTransformerMod});
upperCover.OnSpawned({mod: upperCoverMod});
leftCover.OnSpawned({mod: leftCoverMod});
lowerCover.OnSpawned({mod: lowerCoverMod});
crossVerticalLine.OnSpawned({mod: crossVerticalLineMod});
crossHorizontalLine.OnSpawned({mod: crossHorizontalLineMod});
bibleShadow.OnSpawned({mod: bibleShadowMod});

const staticBibleElements = {
    bibleTransformer,
    upperCover,
    leftCover,
    lowerCover,
    crossVerticalLine,
    crossHorizontalLine,
    bibleShadow
}

for(const testamentIndex in InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments)
{
    const testamentData = await thisBot.CreateTestament({arrangementIndex, testamentIndex, bibleData});
    testamentsData.push(testamentData);
}

return {testamentsData, staticBibleElements};