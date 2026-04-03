import { arrangementService } from "bibleVizUtils.services.index";
import { ObjectPoolTags } from "bibleVizUtils.models.canvas";

/**
 * Creates every piece of a regular Bible structure for the given bibleData based on a given arrangement index.
 * @param {Object} that - Object that contains important data for the function
 * @param {Number} that.arrangementIndex - The index of the arrangement from which the Bible stack will be created
 * @param {StackBibleData} that.bibleData - The StackBibleData to which the structure will be added
 * @example
 * const {testamentsData, staticBiblePieces} = await thisBot.CreateBibleStructure({arrangementIndex: BibleVizDataRepository.getCurrentArrangementIndex(), bibleData: someBibleData});
 */

const {
  arrangementIndex,
  bibleDataId,
}: { arrangementIndex: number; bibleDataId: string } = that;

const testamentsData = [];
const bibleTransformer = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.StackBibleTransformer,
});
const bibleTransformerMod = { stackBibleId: bibleDataId };
const upperCover = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.StackCover,
});
const upperCoverMod = { stackBibleId: bibleDataId };
const leftCover = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.StackCover,
});
const leftCoverMod = { stackBibleId: bibleDataId };
const lowerCover = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.StackCover,
});
const lowerCoverMod = { stackBibleId: bibleDataId };
const crossVerticalLine = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.StackCrossLine,
});
const crossVerticalLineMod = { stackBibleId: bibleDataId };
const crossHorizontalLine = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.StackCrossLine,
});
const crossHorizontalLineMod = { stackBibleId: bibleDataId };
const bibleShadow = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.StackBibleShadow,
});
const bibleShadowMod = { stackBibleId: bibleDataId };

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
const arrangement = arrangementService.getArrangementByIndex(arrangementIndex);
if (arrangement) {
  for (
    let testamentIndex = 0;
    testamentIndex < arrangement.testaments.length;
    testamentIndex++
  ) {
    const testamentData = await thisBot.CreateTestament({
      arrangementIndex,
      testamentIndex,
      bibleDataId,
    });
    testamentsData.push(testamentData);
  }
}

return { testamentsData, staticBiblePieces };
