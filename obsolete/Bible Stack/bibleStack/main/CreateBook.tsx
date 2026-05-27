import { arrangementService } from "bibleVizUtils.services.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";

/**
 * Creates a new `StackBookData` instance, populates it with chapter information, and stores it in the bot's books data.
 *
 * @param {Object} that - Context containing various data properties.
 * @param {number} that.arrangementIndex - Index of the current arrangement.
 * @param {number} that.testamentIndex - Index of the current testament.
 * @param {string} that.sectionIndex - Index of the section within the testament.
 * @param {number} that.levelIndex - Index of the level to which the book belongs to within the stack.
 * @param {number} that.bookIndex - Index of the book in the section.
 * @param {number} that.bookLevelIndex - Index of the book inside the level.
 * @param {number} that.levelsLenght - Amount of levels in the section.
 * @param {boolean} that.isInsideBible - Flag indicating if the current data is inside the Bible.
 * @param {boolean} that.isInsideTestament - Flag indicating if the current data is inside the Testament.
 * @param {boolean} that.isInsideSection - Flag indicating if the current data is inside the Section.
 * @param {StackBibleData} that.bibleData? - Is optional and is the StackBibleData instance to where the StackBookData will be linked to.
 * @param {StackTestamentData} that.testamentData? - Is optional and is the StackTestamentData instance to where the StackBookData will be linked to.
 * @param {StackSectionData} that.sectionData? - Is optional and is the StackSectionData instance to where the StackBookData will be linked to.
 * @param {boolean} that.isHidden? - Flag indicating whether the book should be hidden.
 *
 * @returns {StackBookData} bookData - The newly created `StackBookData` object with chapter data included.
 * @throws {Error} - If the creation of chapter data fails.
 *
 * @example
 * const bookData = await thisBot.CreateBook({
 *     arrangementIndex: someArrangementIndex,
 *     testamentIndex: someTestamentIndex,
 *     sectionIndex: someSectionIndex,
 *     levelIndex: someLevelIndex,
 *     bookIndex: someBookIndex,
 *     bookLevelIndex: someBookLevelIndex,
 *     levelsLenght: someLevelsLenght,
 *     isInsideBible: true,
 *     isInsideTestament: true,
 *     isInsideSection: true,
 *     bibleData: someBibleData,
 *     testamentData: someTestamentData,
 *     sectionData: someSectionData,
 *     isHidden: false
 * });
 */

const {
  arrangementIndex,
  testamentIndex,
  sectionIndex,
  levelIndex,
  bookIndex,
  bookLevelIndex,
  levelsLenght,
  isInsideBible,
  isInsideTestament,
  isInsideSection,
  bibleDataId,
  testamentDataId,
  sectionDataId,
  isHidden = false,
} = that as {
  bibleDataId?: string;
  testamentDataId?: string;
  sectionDataId?: string;
};

const bookInfo = arrangementService.getBookByIndices({
  arrangementIndex,
  testamentIndex,
  sectionIndex,
  bookIndex,
});

if (!bookInfo) {
  console.error(`bookInfo not found at bibleStack.main.CreateBook`);
  return;
}

const parentDataIds = {
  stackBibleId: bibleDataId,
  stackTestamentId: testamentDataId,
  stackSectionId: sectionDataId,
};
const creationParams = {
  arrangementIndex,
  testamentIndex,
  sectionIndex,
  levelIndex,
  bookIndex,
  bookLevelIndex,
  levelsLenght,
};
const bookDataId = uuid();
const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(
  bookInfo.commonName
);

if (!bookStaticInfo) {
  console.error(`bookStaticInfo not found at CreateBook`);
  return;
}

const chaptersData = await Promise.all(
  bookStaticInfo.chaptersInfo.map((chapterInfo) => {
    return thisBot.CreateChapter({
      chapterInfo,
      isInsideBible: true,
      isInsideBook: true,
      bibleDataId,
      testamentDataId,
      sectionDataId,
      bookDataId,
      isHidden,
      bookName: bookInfo.commonName,
    });
  })
);

const bookData = new StackBookData({
  pieceInfo: bookInfo,
  id: bookDataId,
  isInsideBible,
  isInsideTestament,
  isInsideSection,
  parentDataIds,
  creationParams,
  childrenData: chaptersData,
});
thisBot.vars.stackBooksData.push(bookData);
return bookData;
