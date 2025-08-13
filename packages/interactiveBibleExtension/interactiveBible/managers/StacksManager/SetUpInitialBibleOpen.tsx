/**
 * Sets up the initial state of the Bible to be open, updating the position and animation state.
 * 
 * @param {Object} that - Object containing the BibleData to set up.
 * @param {BibleData} that.bibleData - The BibleData object to set up.
 * 
 * @returns {Promise} - A promise that resolves when the animation is complete.
 * 
 * @example
 * StacksManager.SetUpInitialBibleOpen({ bibleData: someBibleData });
 */

const {bibleData} = that;
const dimension = os.getCurrentDimension();
// const bibleTransformerPosition = getBotPosition(bibleData.staticBibleElements.bibleTransformer, dimension);
bibleData.currentState = BibleState.Open;
bibleData.childrenData.forEach((testamentData) => {testamentData.isInsideBible = true});
return bibleData.staticBibleElements.bibleTransformer.DisplayInitialBibleOpenAnimation({bibleData});