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

import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";

const { bibleData }: { bibleData: StackBibleData } = that;
// const dimension = os.getCurrentDimension();
// const bibleTransformerPosition = getBotPosition(bibleData.staticBiblePieces.bibleTransformer, dimension);

bibleData.changeState("Open");
bibleData.childrenData.forEach((testamentData) =>
  testamentData.attachToBible()
);

return bibleData
  .getStaticPiece("bibleTransformer")
  ?.DisplayInitialBibleOpenAnimation({ bibleData });
