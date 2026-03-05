import { IsValueBetween } from "bibleVizUtils.functions.index";
import {
  arrangementService,
  scriptureService,
} from "bibleVizUtils.services.index";

/**
 * Attempts to eject a chapter from a specified book. It ensures that the Bible is not currently animating
 * and checks various conditions to determine if the chapter can be ejected.
 *
 * @param {Object} that - The object containing parameters for the operation.
 * @param {string} that.bookName - The name of the book from which to eject the chapter.
 * @param {number} that.chapterNumber - The chapter number to eject.
 * @returns {boolean} - Returns true if the chapter was successfully ejected, otherwise false.
 *
 * @example
 * const success = thisBot.TryPickChapter({bookName: "Genesis", chapterNumber: 5});
 */

if (thisBot.masks.isBibleAnimating) return false;
setTagMask(thisBot, "isBibleAnimating", true);
const { bookName, chapterNumber } = that;
const numberOfChapters = scriptureService.getBookChapterCount(bookName);
const { arrangementIndex, testamentIndex, sectionIndex, found } =
  arrangementService.getBookInfoPathByName({ name: bookName });

if (
  found &&
  IsValueBetween({ value: chapterNumber, min: 1, max: numberOfChapters })
) {
  if (
    thisBot.vars.lastInteractedStackBookData &&
    thisBot.vars.lastInteractedStackBookData.pieceInfo.commonName ===
      bookName &&
    thisBot.vars.lastInteractedStackBookData.isActive &&
    thisBot.CheckChapterAvailabilityInBook({
      bookData: thisBot.vars.lastInteractedStackBookData,
      chapterNumber,
    })
  ) {
    if (!thisBot.vars.lastInteractedStackBookData.isSelected)
      await thisBot.SelectBook({
        book: thisBot.vars.lastInteractedStackBookData.piece,
        setBibleAnimating: false,
      });
    await thisBot.PickChapter({
      bookData: thisBot.vars.lastInteractedStackBookData,
      chapterNumber,
    });
  } else {
    let bookData = thisBot.vars.lastInteractedStackSectionData?.childrenData
      .flat()
      .find((currBookData) => {
        return currBookData.pieceInfo.commonName === bookName;
      });
    if (
      thisBot.vars.lastInteractedStackSectionData &&
      thisBot.vars.lastInteractedStackSectionData.isActive &&
      bookData &&
      (!thisBot.vars.lastInteractedStackSectionData.isSplitIntoBooks ||
        (thisBot.vars.lastInteractedStackSectionData.isInExplodedView &&
          bookData.isActive)) &&
      thisBot.CheckChapterAvailabilityInBook({ bookData, chapterNumber })
    ) {
      if (!thisBot.vars.lastInteractedStackSectionData.isSplitIntoBooks)
        await thisBot.SelectSection({
          section: thisBot.vars.lastInteractedStackSectionData.piece,
        });
      else if (!thisBot.vars.lastInteractedStackSectionData.isInExplodedView)
        await thisBot.TrySetSectionAsExplodedView({
          section: thisBot.vars.lastInteractedStackSectionData.piece,
          setBibleAnimating: false,
        });
      if (!bookData.isSelected)
        await thisBot.SelectBook({
          book: bookData.piece,
          setBibleAnimating: false,
        });
      await thisBot.PickChapter({ bookData, chapterNumber });
    } else {
      const section = arrangementService.getSectionByIndices({
        arrangementIndex,
        testamentIndex: testamentIndex as number,
        sectionIndex: sectionIndex as number,
      });
      if (section) {
        if (section.books.length > 1) {
          const sectionData =
            thisBot.vars.lastInteractedStackTestamentData?.childrenData.find(
              (currSectionData) => {
                return currSectionData.childrenData
                  .flat()
                  .some((currBookData) => {
                    return currBookData.pieceInfo.commonName === bookName;
                  });
              }
            );
          bookData = sectionData?.childrenData.flat().find((currBookData) => {
            return currBookData.pieceInfo.commonName === bookName;
          });
          if (
            thisBot.vars.lastInteractedStackTestamentData &&
            thisBot.vars.lastInteractedStackTestamentData.isActive &&
            bookData &&
            (!thisBot.vars.lastInteractedStackTestamentData
              .isSplitIntoSections ||
              !sectionData.isSplitIntoBooks ||
              bookData.isActive) &&
            thisBot.CheckChapterAvailabilityInBook({ bookData, chapterNumber })
          ) {
            if (
              !thisBot.vars.lastInteractedStackTestamentData.isSplitIntoSections
            )
              await thisBot.SelectTestament({
                testament: thisBot.vars.lastInteractedStackTestamentData.piece,
              });
            if (!sectionData.isSplitIntoBooks)
              await thisBot.SelectSection({ section: sectionData.piece });
            else if (!sectionData.isInExplodedView)
              await thisBot.TrySetSectionAsExplodedView({
                section: sectionData.piece,
                setBibleAnimating: false,
              });
            if (!bookData.isSelected)
              await thisBot.SelectBook({
                book: bookData.piece,
                setBibleAnimating: false,
              });
            await thisBot.PickChapter({ bookData, chapterNumber });
          } else {
            await thisBot.SpawnBookAndPickChapter({ bookName, chapterNumber });
          }
        } else {
          const sectionBookData =
            thisBot.vars.lastInteractedStackTestamentData?.childrenData.find(
              (currSectionData) => {
                return (
                  currSectionData instanceof StackSectionBookData &&
                  currSectionData.pieceBookInfo.commonName === bookName
                );
              }
            );
          if (
            thisBot.vars.lastInteractedStackTestamentData &&
            thisBot.vars.lastInteractedStackTestamentData.isActive &&
            sectionBookData &&
            (!thisBot.vars.lastInteractedStackTestamentData
              .isSplitIntoSections ||
              sectionBookData.isActive) &&
            thisBot.CheckChapterAvailabilityInBook({
              bookData: sectionBookData,
              chapterNumber,
            })
          ) {
            if (
              !thisBot.vars.lastInteractedStackTestamentData.isSplitIntoSections
            )
              await thisBot.SelectTestament({
                testament: thisBot.vars.lastInteractedStackTestamentData.piece,
              });
            if (!sectionBookData.isSelected)
              await thisBot.SelectBook({
                book: sectionBookData.piece,
                setBibleAnimating: false,
              });
            await thisBot.PickChapter({
              bookData: sectionBookData,
              chapterNumber,
            });
          } else {
            await thisBot.SpawnBookAndPickChapter({ bookName, chapterNumber });
          }
        }
      }
    }
  }
}

setTagMask(thisBot, "isBibleAnimating", false);
return true;
