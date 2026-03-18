import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { IsValueBetween } from "bibleVizUtils.functions.index";
import {
  arrangementService,
  scriptureService,
} from "bibleVizUtils.services.index";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";

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
const {
  bookName,
  chapterNumber,
}: {
  bookName: string;
  chapterNumber: number;
} = that;
const numberOfChapters = scriptureService.getBookChapterCount(bookName);
const { arrangementIndex, testamentIndex, sectionIndex, found } =
  arrangementService.getBookInfoPathByName({ name: bookName });

const lastInteractedBook: StackBookData =
  thisBot.vars.lastInteractedStackBookData;
const lastInteractedSection: StackSectionData =
  thisBot.vars.lastInteractedStackSectionData;
const lastInteractedTestament: StackTestamentData =
  thisBot.vars.lastInteractedStackTestamentData;

if (
  found &&
  IsValueBetween({ value: chapterNumber, min: 1, max: numberOfChapters })
) {
  if (
    lastInteractedBook &&
    lastInteractedBook.getPieceInfoProperty("commonName") === bookName &&
    lastInteractedBook.isActive &&
    thisBot.CheckChapterAvailabilityInBook({
      bookData: lastInteractedBook,
      chapterNumber,
    })
  ) {
    if (!lastInteractedBook.isSelected)
      await thisBot.SelectBook({
        book: lastInteractedBook.piece,
        setBibleAnimating: false,
      });
    await thisBot.PickChapter({
      bookData: lastInteractedBook,
      chapterNumber,
    });
  } else {
    let bookData = lastInteractedSection?.childrenData
      .flat()
      .find((currBookData) => {
        return currBookData.getPieceInfoProperty("commonName") === bookName;
      });
    if (
      lastInteractedSection &&
      lastInteractedSection.isActive &&
      bookData &&
      (!lastInteractedSection.isSplitIntoBooks ||
        (lastInteractedSection.isInExplodedView && bookData.isActive)) &&
      thisBot.CheckChapterAvailabilityInBook({ bookData, chapterNumber })
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
          const sectionData = lastInteractedTestament?.childrenData.find(
            (currSectionData) => {
              return (
                currSectionData instanceof StackSectionData &&
                currSectionData.childrenData.flat().some((currBookData) => {
                  return (
                    currBookData.getPieceInfoProperty("commonName") === bookName
                  );
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
              bookData.isActive) &&
            thisBot.CheckChapterAvailabilityInBook({ bookData, chapterNumber })
          ) {
            if (!lastInteractedTestament.isSplitIntoSections)
              await thisBot.SelectTestament({
                testament: lastInteractedTestament.piece,
                source: "TryPickChapter",
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
          const sectionBookData = lastInteractedTestament?.childrenData.find(
            (currSectionData) => {
              return (
                currSectionData instanceof StackSectionBookData &&
                currSectionData.getPieceInfoProperty("name") === bookName
              );
            }
          ) as StackSectionBookData | undefined;
          if (
            lastInteractedTestament &&
            lastInteractedTestament.isActive &&
            sectionBookData &&
            (!thisBot.vars.lastInteractedStackTestamentData
              .isSplitIntoSections ||
              sectionBookData.isActive) &&
            thisBot.CheckChapterAvailabilityInBook({
              bookData: sectionBookData,
              chapterNumber,
            })
          ) {
            if (!lastInteractedTestament.isSplitIntoSections)
              await thisBot.SelectTestament({
                testament: lastInteractedTestament.piece,
                source: "TryPickChapter",
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
