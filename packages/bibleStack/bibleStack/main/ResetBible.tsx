/**
 * Resets the current state of the Bible and triggers a reset event.
 * This function sets the Bible as animating and triggers the "OnBibleReset" event, passing the `bibleData` to listeners.
 *
 * @param {Object} that - The context object containing the Bible data.
 * @param {StackBibleData} that.bibleData - The data structure representing the current Bible.
 * 
 * @example
 * thisBot.ResetBible({ bibleData: someBibleData });
 */

const {bibleData} = that;
setTagMask(thisBot, "isBibleAnimating", true);
thisBot.vars.lastInteractedStackBibleData = bibleData;
shout("OnStackBibleResetStart", {bibleData});
thisBot.PlaySound({soundName: "ResetBible"});
bibleData.staticBiblePieces.bibleTransformer?.Reset?.({bibleData});