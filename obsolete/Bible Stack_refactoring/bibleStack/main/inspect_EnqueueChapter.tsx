/**
 * This function enqueues chapter data into the provided data object for later processing.
 *
 * @param {Object} that - The context object containing the chapter data to be enqueued.
 * @param {QueuedChapterData} that.queuedChapterData - The chapter data to be enqueued.
 * @param {StackBookData|StackSectionBookData} data - The data object where the chapter data is queued.
 * @example
 * thisBot.EnqueueChapter({queuedChapterData: someQueuedChapterData, data: someBookData})
 */

import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";
import type { QueuedChapterData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";

const {
  queuedChapterData,
  data,
}: {
  queuedChapterData: QueuedChapterData;
  data: StackBookData | StackSectionBookData;
} = that;

data.setQueuedChapterData(queuedChapterData.chapterData);
