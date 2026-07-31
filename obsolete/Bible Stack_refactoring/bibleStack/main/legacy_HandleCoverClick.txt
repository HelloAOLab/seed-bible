/**
 * Handles a click event on the Bible cover, managing the state and animation of the Bible.
 *
 * @param {Object} that - The context object containing the Bible ID.
 * @param {number} that.stackBibleId - The ID of the Bible being interacted with.
 * @example
 * thisBot.HandleCoverClick({stackBibleId: someBibleId});
 */

// const {stackBibleId} = that;
// const bibleData = thisBot.GetBibleDataById({stackBibleId});
// if(thisBot.masks.isBibleAnimating || !bibleData.hasBeenSetUp) return;
// switch(bibleData.currentState)
// {
//     case BibleVizUtils.Data.tags.BibleState.Open:
//     {
//         if(!thisBot.masks.isASectionMakingTourGuide)
//         {
//             thisBot.ResetBible({bibleData});
//         }
//     }
//     break;
//     default: break;
// }

thisBot.DisplayApp();
