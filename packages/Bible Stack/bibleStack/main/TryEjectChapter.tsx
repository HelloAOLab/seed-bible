import { scriptureService } from "bibleVizUtils.services.index";

if (thisBot.masks.isBibleAnimating) return false;
setTagMask(thisBot, "isBibleAnimating", true);
const { bookName, chapterNumber } = that;
const numberOfChapters = scriptureService.getBookChapterCount(bookName);
if (chapterNumber < 1 || chapterNumber > numberOfChapters) return false;
if (
  thisBot.vars.lastInteractedStackBookData &&
  thisBot.vars.lastInteractedStackBookData.pieceInfo.commonName === bookName &&
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
  await thisBot.EjectChapter({
    bookData: thisBot.vars.lastInteractedStackBookData,
    chapterNumber,
  });
} else {
  const bookData = thisBot.vars.lastInteractedStackSectionData
    ? thisBot.vars.lastInteractedStackSectionData.childrenData
        .flat()
        .find((currBookData) => {
          return currBookData.pieceInfo.commonName === bookName;
        })
    : null;
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
    await thisBot.SelectBook({
      book: bookData.piece,
      setBibleAnimating: false,
    });
    await thisBot.EjectChapter({ bookData, chapterNumber });
  } else {
    await thisBot.SpawnBookAndEjectChapter({ bookName, chapterNumber });
  }
}

setTagMask(thisBot, "isBibleAnimating", false);
return true;
