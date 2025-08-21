/**
    * Handles the completion of a Bible reset by highlighting sections in reverse order with a delay between highlights.
    *
    * @param {Object} that - The context object containing the Bible data.
    * @param {Object} that.bibleData - The data of the Bible that has been reset.
    * @returns {Promise<void>} - This function returns a promise that resolves when the highlighting process is complete.
    * @example
    * shout("OnStackBibleResetComplete", {bibleData: someBibleData})
*/

const {bibleData} = that;
const sectionsToHighlight = [];
for(const testamentData of bibleData.childrenData)
{
    testamentData.childrenData.forEach((sectionData) => {
        sectionsToHighlight.push(sectionData.piece);
    })
}
sectionsToHighlight.reverse();
await os.sleep(500);
for(let i = 0; i < sectionsToHighlight.length; i++)
{
    thisBot.TryHighlightPiece({piece: sectionsToHighlight[i], highlightRequestSource: BibleVizUtils.Data.tags.InteractionType.Transition, unhighlightDelay: 2000, typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.Section});
    await os.sleep(100);
}
setTagMask(thisBot, "isBibleAnimating", false);