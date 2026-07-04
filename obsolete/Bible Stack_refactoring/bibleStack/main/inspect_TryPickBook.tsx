import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { arrangementService } from "bibleVizUtils.services.index";

/**
 * Attempts to eject a book from a specified section. It ensures that the Bible is not currently animating
 * and checks various conditions to determine if the book can be ejected.
 *
 * @param {Object} that - The object containing parameters for the operation.
 * @param {number} that.bookName - The name of the book to eject.
 * @returns {boolean} - Returns true if the book was successfully ejected, otherwise false.
 *
 * @example
 * const success = thisBot.TryPickBook({sectionName: "Law", bookName: "Genesis"});
 */

if (thisBot.masks.isBibleAnimating) return false;
setTagMask(thisBot, "isBibleAnimating", true);
const {
  sectionName,
  bookName,
}: {
  sectionName: string;
  bookName: string;
} = that;
const { arrangementIndex, testamentIndex, sectionIndex, found } =
  arrangementService.getBookInfoPathByName({ name: bookName });

if (!found) {
  console.warn("book info path not found at TryPickBook");
  return false;
}
const lastInteractedSection: StackSectionData | undefined =
  thisBot.vars.lastInteractedStackSectionData;
let bookData = lastInteractedSection?.childrenData
  .flat()
  .find((currBookData) => {
    return currBookData.getPieceInfoProperty("commonName") === bookName;
  });
if (
  lastInteractedSection &&
  lastInteractedSection.isActive &&
  bookData &&
  (!lastInteractedSection.isSplitIntoBooks || bookData.isActive)
) {
  if (!lastInteractedSection.isSplitIntoBooks)
    await thisBot.SelectSection({
      section: lastInteractedSection.piece,
    });
  else if (!lastInteractedSection.isInExplodedView)
    await thisBot.TrySetSectionAsExplodedView({
      section: lastInteractedSection.piece,
      setBibleAnimating: false,
    });
  await thisBot.PickBook({
    sectionData: lastInteractedSection,
    bookName,
  });
} else {
  const section = arrangementService.getSectionByIndices({
    arrangementIndex,
    testamentIndex: testamentIndex as number,
    sectionIndex: sectionIndex as number,
  });
  if (!section) {
    console.warn("section info not found at TryPickBook");
    return false;
  }
  const lastInteractedTestament: StackTestamentData | undefined =
    thisBot.vars.lastInteractedStackTestamentData;
  if (section.books.length > 1) {
    const sectionData = lastInteractedTestament?.childrenData.find(
      (currSectionData) => {
        return (
          currSectionData instanceof StackSectionData &&
          currSectionData.childrenData.flat().some((currBookData) => {
            return currBookData.pieceInfo.commonName === bookName;
          })
        );
      }
    ) as StackSectionData | undefined;
    bookData = sectionData?.childrenData.flat().find((currBookData) => {
      return currBookData.pieceInfo.commonName === bookName;
    });
    if (
      lastInteractedTestament &&
      lastInteractedTestament.isActive &&
      bookData &&
      (!lastInteractedTestament.isSplitIntoSections ||
        (sectionData && !sectionData.isSplitIntoBooks) ||
        bookData.isActive)
    ) {
      if (!lastInteractedTestament.isSplitIntoSections)
        await thisBot.SelectTestament({
          testament: lastInteractedTestament.piece,
          source: "TryPickBook",
        });
      if (sectionData) {
        if (!sectionData.isSplitIntoBooks)
          await thisBot.SelectSection({ section: sectionData.piece });
        else if (!sectionData.isInExplodedView)
          await thisBot.TrySetSectionAsExplodedView({
            section: sectionData.piece,
            setBibleAnimating: false,
          });
      }
      await thisBot.PickBook({ sectionData, bookName });
    } else {
      await thisBot.SpawnSectionAndPickBook({ sectionName, bookName });
    }
  } else {
    const sectionBookData = lastInteractedTestament?.childrenData.find(
      (currSectionData) => {
        return (
          currSectionData instanceof StackSectionBookData &&
          currSectionData.pieceBookInfo.commonName === bookName
        );
      }
    ) as StackSectionBookData | undefined;
    if (
      lastInteractedTestament &&
      lastInteractedTestament.isActive &&
      sectionBookData &&
      (!lastInteractedTestament.isSplitIntoSections || sectionBookData.isActive)
    ) {
      if (!lastInteractedTestament.isSplitIntoSections)
        await thisBot.SelectTestament({
          testament: lastInteractedTestament.piece,
          source: "TryPickBook",
        });
      await thisBot.PickSection({
        testamentData: lastInteractedTestament,
        sectionName,
      });
    } else {
      const testament = arrangementService.getTestamentByIndices({
        arrangementIndex,
        testamentIndex: testamentIndex as number,
      });

      if (testament) {
        await thisBot.SpawnTestamentAndPickSection({
          testamentName: testament.name,
          sectionName,
        });
      }
    }
  }
}

setTagMask(thisBot, "isBibleAnimating", false);
return true;
