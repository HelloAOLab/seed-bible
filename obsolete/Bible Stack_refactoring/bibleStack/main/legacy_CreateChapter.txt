import { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { ChapterInfo } from "bibleVizUtils.data.BibleVizDataRepository";
import { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";

/**
 * Creates a new `StackChapterData` instance and stores it in the bot's chapters data.
 *
 * @param {Object} that - Context containing various data properties.
 * @param {Object} that.chapterInfo - Information related to the chapter being created.
 * @param {boolean} that.isInsideBible - Flag indicating if the chapter is inside the Bible.
 * @param {boolean} that.isInsideBook - Flag indicating if the chapter is inside the Book.
 * @param {StackBibleData} that.bibleData? - Is optional and is the StackBibleData instance to where the Chapterdata will be linked to.
 * @param {StackTestamentData} that.testamentData? - Is optional and is the StackTestamentData instance to where the Chapterdata will be linked to.
 * @param {StackSectionData} that.sectionData? - Is optional and is the StackSectionData instance to where the Chapterdata will be linked to.
 * @param {StackSectionBookData} that.sectionBookData? - Is optional and is the StackSectionBookData instance to where the Chapterdata will be linked to.
 * @param {StackBookData} that.bookData? - Is optional and is the StackBookData instance to where the Chapterdata will be linked to.
 * @param {boolean} that.isHidden? - Flag indicating whether the chapter should be hidden.
 *
 * @returns {StackChapterData} chapterData - The newly created `StackChapterData` object.
 *
 * @example
 * const chapterData = thisBot.CreateChapter({
 *     chapterInfo: someChapterInfo,
 *     isInsideBible: true,
 *     isInsideBook: true,
 *     bibleData: someBibleData,
 *     testamentData: someTestamentData,
 *     sectionData: someSectionData,
 *     bookData: someBookData,
 *     isHidden: false
 * })
 */

const {
  chapterInfo,
  isInsideBible,
  isInsideBook,
  isHidden = false,
  bibleDataId,
  testamentDataId,
  sectionDataId,
  sectionBookDataId,
  bookDataId,
  bookName,
} = that as {
  bibleDataId?: string;
  testamentDataId?: string;
  sectionDataId?: string;
  sectionBookDataId?: string;
  bookDataId?: string;
  isHidden?: boolean;
  isInsideBible: boolean;
  isInsideBook: boolean;
  chapterInfo: ChapterInfo;
  bookName: string;
};
const parentDataIds = {
  stackBibleId: bibleDataId,
  stackTestamentId: testamentDataId,
  stackSectionBookId: sectionBookDataId,
  stackSectionId: sectionDataId,
  stackBookId: bookDataId,
};

if (!bookName) {
  console.error("bookName not defined at CreateChapter");
  return;
}
const creationParams = { bookName };
const chapterData = new StackChapterData({
  id: uuid(),
  pieceInfo: chapterInfo,
  parentDataIds,
  isInsideBible,
  isInsideBook,
  isHidden,
  creationParams,
  isSelected: false,
});
thisBot.vars.stackChaptersData.push(chapterData);
return chapterData;
