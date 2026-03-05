/**
 * Updates the stack of a specific testament, handling its position and animations.
 * The testament is only updated if it is split into sections and not empty.
 *
 * @param {Object} that - Contains the necessary data for the update.
 * @param {StackTestamentData} that.testamentData - The testament data object containing information about the sections and books.
 * @returns {Promise<boolean>} Returns `true` if the update was successful, or `false` if the testament was not updated.
 *
 * @example
 * thisBot.UpdateTestamentStack({testamentData: someTestamentData});
 */

const { testamentData, isInstantaneous } = that;
if (!testamentData.isSplitIntoSections || IsTestamentEmpty()) return false;
const dimension = os.getCurrentDimension();
const duration = isInstantaneous ? 0 : 0.5;
const easing = { type: "sinusoidal", mode: "inout" };
const testamentPosition = getBotPosition(testamentData.piece, dimension);
const animations = [];

const { newTestamentAnimations } = await thisBot.HandleTestamentDataInStack({
  isInstantaneous,
  testamentData,
  desiredPositionZ: testamentPosition.z,
  dimension,
  duration,
  easing,
});
animations.push(...newTestamentAnimations);

await Promise.allSettled(animations);

return true;

function IsTestamentEmpty() {
  const result = !testamentData.childrenData.some((sectionData: any) => {
    return sectionData.isSplitIntoBooks ? true : sectionData.isActive;
  });
  return result;
}
