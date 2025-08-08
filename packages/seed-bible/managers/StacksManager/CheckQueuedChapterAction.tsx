/**
    * Determines if there's a queued chapter action for a specified BookData or SectionBookData. If so, perform the corresponding action and clears the queue.
    * @param {Object} that - Object that contains important data for the function
    * @param {BookData, SectionBookData} that.data - The BookData or SectionBookData to check
    * @example
    * StacksManager.CheckQueuedChapterAction({data: someData});
*/

const {data} = that;
if(data.queuedChapterData)
{
    switch(data.queuedChapterData.action)
    {
        case EnqueueChapterActions.Select: {
            thisBot.TrySelectChapter({book: data.queuedChapterData.book, chapterNumber: data.queuedChapterData.chapterNumber});
        }
        break;
        default: break;
    }
    data.queuedChapterData = null
}