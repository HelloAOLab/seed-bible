/**
 * Determines if the specified chapter is active in the specified book
 * @param {Object} that - Object that contains important data for the function
 * @param {StackBookData} that.bookData - The book data to check
 * @param {Number} that.chapterNumber - The number of the chapter to find
 * @example
 * const isChapterAvailable = thisBot.CheckChapterAvailabilityInBook({bookData: someBookData, chapterNumber: 1}))
 */

import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";

const {
  bookData,
  chapterNumber,
}: {
  bookData: StackBookData;
  chapterNumber: number;
} = that;
const chapterData = bookData.childrenData[chapterNumber - 1];

return chapterData && !chapterData.isHidden;
