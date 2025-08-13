/**
    * Resets the state of the Bible transformer by closing and reopening the Bible.
    * Triggers events upon completion of each action.
    * @param {Object} that - The context containing Bible data.
    * @param {Object} that.bibleData - The data related to the Bible being processed.
    * @example
    * bibleTransformer.OnBibleReset({bibleData: someBibleData})
*/

const {bibleData} = that
if(thisBot.tags.isBaseBibleTransformer || !thisBot.tags.isInUse) return;
const duration = 0.42;
const easing = {type: "sinusoidal", mode: "inout"}
thisBot.CloseBible({duration, easing, bibleData})
.then(() => {
    shout('OnBibleCloseComplete', {bibleData})
    thisBot.OpenBible({duration, easing, bibleData})
    .then(() => {shout("OnBibleResetComplete", {bibleData})});
})