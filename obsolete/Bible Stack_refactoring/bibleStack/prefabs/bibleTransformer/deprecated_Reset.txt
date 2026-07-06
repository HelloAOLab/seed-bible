/**
    * Resets the state of the Bible transformer by closing and reopening the Bible.
    * Triggers events upon completion of each action.
    * @param {Object} that - The context containing Bible data.
    * @param {Object} that.bibleData - The data related to the Bible being processed.
    * @example
    * bibleTransformer.OnBibleReset({bibleData: someBibleData})
*/

const {bibleData, speedMultiplier = 1} = that
if(thisBot.tags.isBaseStackBibleTransformer || !thisBot.tags.isInUse) return;
const duration = 0.42 / speedMultiplier;
const easing = {type: "sinusoidal", mode: "inout"}
return thisBot.CloseBible({duration, easing, bibleData})
.then(() => {
    shout('OnStackBibleCloseComplete', {bibleData})
    return thisBot.OpenBible({duration, easing, bibleData})
    .then(() => {shout("OnStackBibleResetComplete", {bibleData})});
})