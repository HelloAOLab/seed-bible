/**
 * Pulls out a given piece from its parent stack in the Bible arrangement and creates a copy of the piece.
 *
 * This function handles various piece types such as `StackTestamentData`, `StackSectionData`, `StackSectionBookData`, `StackBookData`, and `StackChapterData`.
 * It removes the piece from its parent data's children array, nullifies its parent IDs, creates a copy of the piece, and updates the stack structure accordingly.
 * It also handles clearing the highlight and selection states of the piece and its children.
 *
 * @param {Object} that - The context object containing the piece data and related stack information.
 * @param {StackPieceData} that.pieceData - The piece data being pulled out.
 * @param {StackBibleData} that.bibleData? - Is optional and is the Bible data structure the piece belongs to.
 * @param {StackTestamentData} that.testamentData? - Is optional and is the Testament data structure the piece belongs to.
 * @param {StackSectionData} that.sectionData? - Is optional and is the Section data structure the piece belongs to.
 * @param {StackSectionBookData} that.sectionBookData? - Is optional and is the SectionBook data structure the piece belongs to.
 * @param {StackBookData} that.bookData? - Is optional and is the Book data structure the piece belongs to.
 *
 * @returns {Promise<void>} - This function is asynchronous and returns a promise that resolves when the operation completes.
 *
 * @example
 * thisBot.PullOutPieceFromParent({
 *   pieceData: somePieceData,
 *   bibleData: someBibleData,
 *   testamentData: someTestamentData,
 *   sectionData: someSectionData,
 *   sectionBookData: someSectionBookData,
 *   bookData: someBookData
 * });
 */

import { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";

const {
  pieceData,
  bibleData,
  testamentData,
  sectionData,
  sectionBookData,
  bookData,
}: {
  bibleData: StackBibleData;
  pieceData:
    | StackTestamentData
    | StackSectionData
    | StackSectionBookData
    | StackBookData
    | StackChapterData;
  testamentData: StackTestamentData | undefined;
  sectionData: StackSectionData | undefined;
  sectionBookData: StackSectionBookData | undefined;
  bookData: StackBookData | undefined;
} = that;

if (pieceData.piece) {
  pieceData.piece.tags.toErase = true;
}

switch (true) {
  case pieceData instanceof StackTestamentData:
    {
      const testamentCopy = await CreateDataCopy(pieceData);
      pieceData.clearParentIds(["stackBibleId"]);
      bibleData.tryReplaceChild(pieceData, testamentCopy);
    }
    break;
  case pieceData instanceof StackSectionBookData:
  case pieceData instanceof StackSectionData:
    {
      const sectionCopy = await CreateDataCopy(pieceData);
      pieceData.clearParentIds(["stackBibleId", "stackTestamentId"]);
      testamentData?.tryReplaceChild(pieceData, sectionCopy);
    }
    break;
  case pieceData instanceof StackBookData:
    {
      const bookCopy = await CreateDataCopy(pieceData);
      pieceData.clearParentIds([
        "stackBibleId",
        "stackTestamentId",
        "stackSectionId",
      ]);
      sectionData?.tryReplaceBook(pieceData, bookCopy);
    }
    break;
  case pieceData instanceof StackChapterData:
    {
      const chapterCopy = await CreateDataCopy(pieceData);
      const actualParentData = sectionBookData ?? bookData;
      pieceData.clearParentIds([
        "stackBibleId",
        "stackTestamentId",
        "stackSectionId",
        "stackSectionBookId",
        "stackBookId",
      ]);

      if (actualParentData) {
        actualParentData.tryReplaceChild(pieceData, chapterCopy);
      }
    }
    break;
  default:
    break;
}

return Promise.all(shout("OnStackPiecePulledOut"));

async function CreateDataCopy<
  K extends
    | StackTestamentData
    | StackSectionData
    | StackSectionBookData
    | StackBookData
    | StackChapterData,
>(data: K): Promise<K> {
  if (data instanceof StackTestamentData) {
    return (await thisBot.CreateTestament({
      arrangementIndex: data.getArrangementIndex(),
      testamentIndex: data.getTestamentIndex(),
      bibleData,
      isHidden: true,
    })) as K;
  }

  if (
    data instanceof StackSectionData ||
    data instanceof StackSectionBookData
  ) {
    return (await thisBot.CreateSection({
      arrangementIndex: data.getArrangementIndex(),
      testamentIndex: data.getTestamentIndex(),
      sectionIndex: data.getSectionIndex(),
      isInsideBible: true,
      isInsideTestament: true,
      bibleData,
      testamentData,
    })) as K;
  }

  if (data instanceof StackBookData) {
    return (await thisBot.CreateBook({
      arrangementIndex: data.getArrangementIndex(),
      testamentIndex: data.getTestamentIndex(),
      sectionIndex: data.getSectionIndex(),
      levelIndex: data.getLevelIndex(),
      bookIndex: data.getBookIndex(),
      bookLevelIndex: data.getBookLevelIndex(),
      levelsLenght: data.getLevelsLength(),
      isInsideBible: true,
      isInsideTestament: true,
      isInsideSection: true,
      bibleData,
      testamentData,
      sectionData,
    })) as K;
  }

  if (data instanceof StackChapterData) {
    return (await thisBot.CreateChapter({
      chapterInfo: data.pieceInfo,
      isInsideBible: true,
      isInsideBook: true,
      bibleData,
      testamentData,
      sectionData,
      sectionBookData,
      bookData,
      isHidden: true,
    })) as K;
  }

  throw new Error(`CreateDataCopy: Data type not supported or unknown`);
}
