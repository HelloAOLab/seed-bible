import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/StackBookData";

/**
 * Receives the name of the book and the number of the chapter and selects that chapter on the stack if possible, and deselect the previous chapter selected if exists
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.book - The book to select the chapter on
 * @param {Number} that.chapterNumber - The number of the chapter
 * @example
 * shout("TrySelectChapter", {book: someBook, chapterNumber: 1});
 */

interface Info {
  chapterData?: StackChapterData | undefined;
  bookData?: StackBookData | undefined;
  chapterNumber?: number | undefined;
}

const {
  info,
}: {
  info: Info | Info[];
} = that;

const fixedInfo = (Array.isArray(info) ? info : [info])
  .map(({ chapterData, bookData, chapterNumber }) => {
    if (!chapterData) {
      if (!bookData || !chapterNumber) {
        throw new Error(
          "No chapterData or bookData and chapterNumber provided at TrySelectChapter"
        );
      }
      chapterData = bookData.childrenData.find((currentChapterData) => {
        return (
          currentChapterData.piece &&
          currentChapterData.piece.tags.chapterNumber == chapterNumber &&
          currentChapterData.isActive &&
          !currentChapterData.isHidden
        );
      });
    }
    return { chapterData, bookData, chapterNumber };
  })
  .filter(({ chapterData }) => {
    return chapterData && !chapterData.isSelected;
  });

// console.log(`[Debug] TrySelectChapter`, {fixedInfo, info});

if (fixedInfo.length > 0) {
  await Promise.all(
    fixedInfo.map(({ chapterData }) => {
      chapterData?.select();

      if (chapterData?.piece?.masks.isOnTheGround)
        tryHideNotification(chapterData.piece);

      shout("OnBiblePieceSelected", { piece: chapterData?.piece });

      return chapterData?.piece?.Select({ chapterData });
    })
  );
}
