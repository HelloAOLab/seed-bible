/**
    * Determines if there's a queued chapter action for a specified StackBookData or StackSectionBookData. If so, perform the corresponding action and clears the queue.
    * @param {Object} that - Object that contains important data for the function
    * @param {StackBookData, StackSectionBookData} that.data - The StackBookData or StackSectionBookData to check
    * @example
    * thisBot.CheckQueuedChapterAction({data: someData});
*/

const {data} = that;
if(data.queuedChapterData)
{
    switch(data.queuedChapterData.action)
    {
        case BibleVizUtils.Data.tags.EnqueueChapterActions.Select: {
            thisBot.TrySelectChapter({book: data.queuedChapterData.book, chapterNumber: data.queuedChapterData.chapterNumber});
        }
        break;
        default: break;
    }
    data.queuedChapterData = null
}