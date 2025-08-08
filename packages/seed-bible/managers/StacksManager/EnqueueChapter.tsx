/**
    * This function enqueues chapter data into the provided data object for later processing.
    *
    * @param {Object} that - The context object containing the chapter data to be enqueued.
    * @param {QueuedChapterData} that.queuedChapterData - The chapter data to be enqueued.
    * @param {BookData|SectionBookData} data - The data object where the chapter data is queued.
    * @example
    * StacksManager.EnqueueChapter({queuedChapterData: someQueuedChapterData, data: someBookData})
*/

const {queuedChapterData, data} = that;
data.queuedChapterData = queuedChapterData;