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
const { sectionName, bookName } = that;
const { arrangementIndex, testamentIndex, sectionIndex, found } =
  arrangementService.getBookInfoPathByName({ name: bookName });

if (found) {
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
      bookData.isActive)
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
    await thisBot.PickBook({
      sectionData: thisBot.vars.lastInteractedStackSectionData,
      bookName,
    });
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
          (!thisBot.vars.lastInteractedStackTestamentData.isSplitIntoSections ||
            (thisBot.vars.lastInteractedStackTestamentData
              .isSplitIntoSections &&
              (!sectionData.isSplitIntoBooks || bookData.isActive)))
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
          await thisBot.PickBook({ sectionData, bookName });
        } else {
          await thisBot.SpawnSectionAndPickBook({ sectionName, bookName });
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
          (!thisBot.vars.lastInteractedStackTestamentData.isSplitIntoSections ||
            (thisBot.vars.lastInteractedStackTestamentData
              .isSplitIntoSections &&
              sectionBookData.isActive))
        ) {
          if (
            !thisBot.vars.lastInteractedStackTestamentData.isSplitIntoSections
          )
            await thisBot.SelectTestament({
              testament: thisBot.vars.lastInteractedStackTestamentData.piece,
            });
          await thisBot.PickSection({
            testamentData: thisBot.vars.lastInteractedStackTestamentData,
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
  }
}

setTagMask(thisBot, "isBibleAnimating", false);
return true;
