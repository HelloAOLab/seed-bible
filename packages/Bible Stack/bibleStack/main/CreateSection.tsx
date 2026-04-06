import {
  scriptureService,
  stackService,
  arrangementService,
} from "bibleVizUtils.services.index";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";

/**
 * Creates a `StackSectionData` or `StackSectionBookData` instance based on the number of books in the section, and sets up the corresponding books or chapters.
 *
 * @param {Object} that - Context containing various data properties.
 * @param {number} that.arrangementIndex - Index of the current arrangement.
 * @param {number} that.testamentIndex - Index of the current testament.
 * @param {string} that.sectionIndex - Index of the section within the testament.
 * @param {boolean} that.isInsideBible - Flag indicating if the section is inside the Bible.
 * @param {boolean} that.isInsideTestament - Flag indicating if the section is inside the Testament.
 * @param {StackBibleData} that.bibleData? - Is optional and is the StackBibleData instance to where the StackSectionData or StackSectionBookData will be linked to.
 * @param {StackTestamentData} that.testamentData? - Is optional and is the StackTestamentData instance to where the StackSectionData or StackSectionBookData will be linked to.
 * @param {boolean} that.isHidden? - Flag indicating whether the section or section book should be hidden.
 *
 * @returns {StackSectionData|StackSectionBookData} data - The newly created `StackSectionData` or `StackSectionBookData` object with its children (books or chapters).
 * @throws {Error} - If the creation of books or chapters fails.
 *
 * @example
 * const sectionData = await thisBot.CreateSection({
 *     arrangementIndex: someArrengementIndex,
 *     testamentIndex: someTestamentIndex,
 *     sectionIndex: someSectionIndex,
 *     isInsideBible: true,
 *     isInsideTestament: true,
 *     bibleData: someBibleData,
 *     testamentData: someTestamentData,
 *     isHidden: false
 * });*/

const {
  arrangementIndex,
  testamentIndex,
  sectionIndex,
  isInsideBible,
  isInsideTestament,
  bibleDataId,
  testamentDataId,
  isHidden = false,
}: {
  bibleDataId?: string;
  testamentDataId?: string;
} = that;
const sectionInfo = arrangementService.getSectionByIndices({
  arrangementIndex,
  testamentIndex,
  sectionIndex,
});

if (!sectionInfo) {
  console.error(`sectionInfo not found at CreateSection`);
  return;
}

const amountOfChaptersInSection = scriptureService.getSectionChapterCount(
  sectionInfo.books
);
let data: StackSectionData | StackSectionBookData | undefined;
const creationParams = {
  arrangementIndex,
  testamentIndex,
  sectionIndex,
  amountOfChaptersInSection,
};
const parentDataIds = {
  stackBibleId: bibleDataId,
  stackTestamentId: testamentDataId,
};

const sectionDataId = uuid();

if (sectionInfo.books.length > 1) {
  const levels = stackService.getSectionLevels(sectionInfo.books);
  const levelsLenght = levels.length;
  const booksDataArray: StackBookData[][] = [];
  for (const level of levels) {
    const booksData: StackBookData[] = [];
    const levelIndex = levels.indexOf(level);
    for (const bookInfo of level) {
      const bookIndex = sectionInfo.books.indexOf(bookInfo);
      const bookLevelIndex = level.indexOf(bookInfo);
      const bookData: StackBookData = await thisBot.CreateBook({
        arrangementIndex,
        testamentIndex,
        sectionIndex,
        levelIndex,
        bookIndex,
        bookLevelIndex,
        levelsLenght,
        isInsideBible,
        isInsideTestament,
        isInsideSection: true,
        bibleDataId,
        testamentDataId,
        sectionDataId,
        isHidden,
      });
      booksData.push(bookData);
    }
    booksDataArray.push(booksData);
  }
  data = new StackSectionData({
    pieceInfo: sectionInfo,
    id: sectionDataId,
    parentDataIds,
    isInsideBible,
    isInsideTestament,
    creationParams,
    childrenData: booksDataArray,
  });
  thisBot.vars.stackSectionsData.push(data);
} else {
  const pieceBookInfo = sectionInfo.books[0];
  if (pieceBookInfo) {
    const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(
      pieceBookInfo.commonName
    );
    if (!bookStaticInfo) {
      console.error("bookStaticInfo not found at CreateSection");
      return;
    }
    const chaptersData: StackChapterData[] = await Promise.all(
      bookStaticInfo.chaptersInfo.map((chapterInfo) => {
        return thisBot.CreateChapter({
          chapterInfo,
          isInsideBible: true,
          isInsideBook: true,
          bibleDataId,
          testamentDataId,
          sectionBookDataId: sectionDataId,
          isHidden,
          bookName: pieceBookInfo.commonName,
        });
      })
    );
    data = new StackSectionBookData({
      pieceInfo: sectionInfo,
      pieceBookInfo,
      id: sectionDataId,
      parentDataIds,
      isInsideBible,
      isInsideTestament,
      creationParams,
      childrenData: chaptersData,
    });
    thisBot.vars.stackSectionBooksData.push(data);
  }
}

return data;
