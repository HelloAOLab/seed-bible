import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { tryHideIndicators } from "bibleVizUtils.controllers.userPresence.activityIndicatorsController";
import { updateNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";

/**
 * Deselects a chapter piece and updates tag masks for animation and deselection states.
 *
 * @param {Object} that - Context containing the chapter data and optional flags.
 * @param {StackChapterData} that.chapterData - Data object representing the chapter to deselect.
 * @param {boolean} that.setBibleAnimating? - Is optional and is a flag indicating whether to set the Bible animating state.
 *
 * @returns {Promise<void>} - Resolves when the deselection is complete.
 * @throws {Error} - If deselection fails.
 *
 * @example
 * thisBot.DeselectChapter({chapterData: someChapterData, setBibleAnimating: true});
 */

type Info = { chapterData: StackChapterData };

const {
  info /*, setBibleAnimating = false*/,
}: {
  info: Info | Info[];
} = that;

const fixedInfo = Array.isArray(info) ? info : [info];

await Promise.all(
  fixedInfo.map(({ chapterData }) => {
    // if(setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", true);
    if (!chapterData.piece) {
      console.warn("chapterData.piece not defined at DeselectChapter");
      return Promise.resolve();
    }
    chapterData.deselect();
    tryHideIndicators(chapterData.piece);
    // setTagMask(thisBot, "aChapterIsBeingDeselected", true);
    return (chapterData.piece.Deselect({ chapterData }) as Promise<void>).then(
      () => {
        updateNotification(
          chapterData,
          thisBot.tags.activityNotificationOffset,
          {
            x: thisBot.tags.activityNotificationScaleX,
            y: thisBot.tags.activityNotificationScaleY,
          }
        );
      }
    );
    // setTagMask(thisBot, "aChapterIsBeingDeselected", false);
    // if(setBibleAnimating) setTagMask(thisBot, "isBibleAnimating", false);
  })
);
