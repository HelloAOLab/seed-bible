/**
    * Receives the name of the book and the number of the chapter and selects that chapter on the stack if possible, and deselect the previous chapter selected if exists
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.book - The book to select the chapter on
    * @param {Number} that.chapterNumber - The number of the chapter
    * @example
    * shout("TrySelectChapter", {book: someBook, chapterNumber: 1});
*/

import {QueuedChapterData} from "interactiveBible.managers.StacksManager.QueuedChapterData"

let {bookData, chapterNumber, chapterData} = that;
if(!chapterData)
{
    chapterData = bookData.childrenData.find((currentChapterData) => {
        return currentChapterData.element.tags.chapterNumber == chapterNumber   && 
                currentChapterData.isActive                                     &&
                !currentChapterData.isHidden
        }
    )
}
if(chapterData && !chapterData.isSelected)
{
    if((thisBot.masks.aChapterIsBeingSelected || thisBot.masks.aChapterIsBeingDeselected) && bookData)
    {
        const queuedChapterData = new QueuedChapterData({
            bookData,
            chapterNumber,
            chapterData,
            action: EnqueueChapterActions.Select
        })
        thisBot.EnqueueChapter({queuedChapterData, data: bookData});
        return;
    }

    chapterData.isSelected = true;
    InstanceManager.TryHideUsersNotificationOnElement({element: chapterData.element})
    shout("OnBibleElementSelected", {element: chapterData.element});

    setTagMask(thisBot, "aChapterIsBeingSelected", true);
    setTagMask(thisBot, "isBibleAnimating", true);

    await Promise.all([
        bookData?.currentSelectedChapterData && bookData.currentSelectedChapterData != chapterData ? thisBot.DeselectChapter({chapterData: bookData.currentSelectedChapterData}) : null,
        chapterData.element.Select({chapterData})
    ])

    setTagMask(thisBot, "aChapterIsBeingSelected", false)
    setTagMask(thisBot, "isBibleAnimating", false);

    if(bookData) 
    {
        bookData.currentSelectedChapterData = chapterData;
        thisBot.CheckQueuedChapterAction({data: bookData});
    }

    return true;
}