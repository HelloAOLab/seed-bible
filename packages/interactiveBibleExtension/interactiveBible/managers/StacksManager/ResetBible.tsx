/**
 * Resets the current state of the Bible and triggers a reset event.
 * This function sets the Bible as animating and triggers the "OnBibleReset" event, passing the `bibleData` to listeners.
 *
 * @param {Object} that - The context object containing the Bible data.
 * @param {BibleData} that.bibleData - The data structure representing the current Bible.
 * 
 * @example
 * StacksManager.ResetBible({ bibleData: someBibleData });
 */

const {bibleData} = that;
setTagMask(thisBot, "isBibleAnimating", true);
thisBot.vars.lastInteractedBibleData = bibleData;
shout("OnBibleResetStart", {bibleData});
bibleData.staticBibleElements.bibleTransformer?.Reset?.({bibleData});