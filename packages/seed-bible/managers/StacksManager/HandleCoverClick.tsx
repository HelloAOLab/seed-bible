/**
    * Handles a click event on the Bible cover, managing the state and animation of the Bible.
    *
    * @param {Object} that - The context object containing the Bible ID.
    * @param {number} that.bibleId - The ID of the Bible being interacted with.
    * @example
    * StacksManager.HandleCoverClick({bibleId: someBibleId});
*/

const {bibleId} = that;
const bibleData = StacksManager.GetBibleDataById({bibleId});
if(thisBot.masks.isBibleAnimating || !bibleData.hasBeenSetUp) return;
switch(bibleData.currentState)
{
    case BibleState.Open:
    {
        if(!thisBot.masks.isASectionMakingTourGuide)
        {
            thisBot.ResetBible({bibleData});
        }
    }
    break;
    default: break;
}