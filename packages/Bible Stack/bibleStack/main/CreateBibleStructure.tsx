/**
 * Creates every piece of a regular Bible structure for the given bibleData based on a given arrangement index.
 * @param {Object} that - Object that contains important data for the function
 * @param {Number} that.arrangementIndex - The index of the arrangement from which the Bible stack will be created
 * @param {StackBibleData} that.bibleData - The StackBibleData to which the structure will be added
 * @example
 * const {testamentsData, staticBiblePieces} = await thisBot.CreateBibleStructure({arrangementIndex: BibleVizUtils.Functions.GetCurrentArrangementIndex(), bibleData: someBibleData});
 */

const { arrangementIndex, bibleData } = that;
const testamentsData = [];
const bibleTransformer = ObjectPooler.GetObjectFromPool({
  tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackBibleTransformer,
});
const bibleTransformerMod = { stackBibleId: bibleData.id };
const upperCover = ObjectPooler.GetObjectFromPool({
  tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackCover,
});
const upperCoverMod = { stackBibleId: bibleData.id };
const leftCover = ObjectPooler.GetObjectFromPool({
  tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackCover,
});
const leftCoverMod = { stackBibleId: bibleData.id };
const lowerCover = ObjectPooler.GetObjectFromPool({
  tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackCover,
});
const lowerCoverMod = { stackBibleId: bibleData.id };
const crossVerticalLine = ObjectPooler.GetObjectFromPool({
  tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackCrossLine,
});
const crossVerticalLineMod = { stackBibleId: bibleData.id };
const crossHorizontalLine = ObjectPooler.GetObjectFromPool({
  tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackCrossLine,
});
const crossHorizontalLineMod = { stackBibleId: bibleData.id };
const bibleShadow = ObjectPooler.GetObjectFromPool({
  tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackBibleShadow,
});
const bibleShadowMod = { stackBibleId: bibleData.id };

bibleTransformer.OnSpawned({ mod: bibleTransformerMod });
upperCover.OnSpawned({ mod: upperCoverMod });
leftCover.OnSpawned({ mod: leftCoverMod });
lowerCover.OnSpawned({ mod: lowerCoverMod });
crossVerticalLine.OnSpawned({ mod: crossVerticalLineMod });
crossHorizontalLine.OnSpawned({ mod: crossHorizontalLineMod });
bibleShadow.OnSpawned({ mod: bibleShadowMod });

const staticBiblePieces = {
  bibleTransformer,
  upperCover,
  leftCover,
  lowerCover,
  crossVerticalLine,
  crossHorizontalLine,
  bibleShadow,
};
for (const testamentIndex in BibleVizUtils.Data.vars.fixedArrangementsInfo[
  arrangementIndex
].testaments) {
  const testamentData = await thisBot.CreateTestament({
    arrangementIndex,
    testamentIndex,
    bibleData,
  });
  testamentsData.push(testamentData);
}

return { testamentsData, staticBiblePieces };
