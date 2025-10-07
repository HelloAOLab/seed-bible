/**
 * Determines if there's a queued chapter action for a specified StackBookData or StackSectionBookData. If so, perform the corresponding action and clears the queue.
 * @param {Object} that - Object that contains important data for the function
 * @param {StackBookData, StackSectionBookData} that.data - The StackBookData or StackSectionBookData to check
 * @example
 * thisBot.CheckQueuedChapterAction({data: someData});
 */

// [...thisBot.vars.groundedChapterSelectionQueue, ...thisBot.vars.stackedChapterSelectionQueue].map((entry) => {

// })

switch (data.queuedChapterData.action) {
  case BibleVizUtils.Data.tags.EnqueueChapterActions.Select: {
    const queuedChapterData = data.queuedChapterData;
    data.queuedChapterData = null;
    return thisBot.TrySelectChapter({
      bookData: queuedChapterData.bookData,
      chapterNumber: queuedChapterData.chapterNumber,
    });
  }
  default:
    break;
}
