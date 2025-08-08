/**
    * Handles the completion of the initial Bible open animation by highlighting each testament element.
    * The function waits for a short delay before starting to highlight each element in sequence.
    *
    * @param {Object} that - The context object containing the Bible data.
    * @param {Object} that.bibleData - The data of the Bible whose testaments will be highlighted.
    * @returns {Promise<void>} - This function returns a promise that resolves when all highlights are complete.
    * @example
    * shout("OnInitialBibleOpenAnimationCompleted", {bibleData: someBibleData})
*/

const {bibleData} = that;
if(bibleData.bibleType !== BibleType.Default) return;
await os.sleep(500);
for(const testamentData of bibleData.childrenData)
{
    thisBot.TryHighlightElement({element: testamentData.element, highlightRequestSource: StackElementInteractionType.Transition, unhighlightDelay: 4000});
    await os.sleep(100);
}