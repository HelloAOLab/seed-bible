/**
 * Sets up the initial state of the Bible to be open, updating the position and animation state.
 *
 * @param {Object} that - Object containing the StackBibleData to set up.
 * @param {StackBibleData} that.bibleData - The StackBibleData object to set up.
 *
 * @returns {Promise} - A promise that resolves when the animation is complete.
 *
 * @example
 * thisBot.SetUpInitialBibleOpen({ bibleData: someBibleData });
 */

const { bibleData } = that;
// const dimension = os.getCurrentDimension();
// const bibleTransformerPosition = getBotPosition(bibleData.staticBiblePieces.bibleTransformer, dimension);
bibleData.currentState = BibleVizUtils.Data.tags.BibleState.Open;
bibleData.childrenData.forEach((testamentData: any) => {
  testamentData.isInsideBible = true;
});

return bibleData.staticBiblePieces.bibleTransformer.DisplayInitialBibleOpenAnimation(
  { bibleData }
);
