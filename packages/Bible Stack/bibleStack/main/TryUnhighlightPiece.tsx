/**
 * Unhighlights a Bible piece if possible
 *
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.piece - The bot to be unhighlgihted
 * @param {Number} that.delay - Is optional and is a delay before unhighlighting the bot
 * @param {String} that.requestSource? - Is optional and is the source of the unhighlight request. Available values can be found at globalThis.BibleVizUtils.Data.tags.InteractionType
 * @param {Number} that.customDuration? - Is optional and is a custom duration for the unhighlight animation
 *
 * @example
 * shout("TryUnhighlightPiece", {piece: someBot, delay: 4000, requestSource: BibleVizUtils.Data.tags.InteractionType.Transition, customDuration: 1});
 */

import type { UnhighlightDelayInfo } from "bibleVizUtils.models.canvas";
import { updateNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { BibleState } from "bibleVizUtils.models.canvas";

let { delay } = that;
const {
  piece,
  tryUpdateActivityNotification = true,
  requestSource,
  customDuration,
  speedMultiplier = 1,
  isInstantaneous = false,
} = that;

const data:
  | StackTestamentData
  | StackSectionData
  | StackSectionBookData
  | StackBookData
  | StackChapterData
  | undefined = thisBot.GetPieceData({ piece });

if (!data) {
  throw new Error(`data not founda at TryUnhighlightPiece`);
}

const { bibleData } = await thisBot.GetDataChainFromParentDataIds({
  parentDataIds: data.parentDataIds,
});
const {
  unhighlightDelayInfo: currentUnhighlightDelayInfo,
  unhighlightDelayInfoIndex: currentUnhighlightDelayInfoIndex,
} = thisBot.GetUnhighlightDelayInfo({ piece });
if (
  !thisBot.IsBiblePieceHighlighted({ piece }) ||
  ((piece.masks.isUnhighlighting || thisBot.masks.isBibleAnimating) &&
    requestSource !== BibleVizUtils.Data.tags.InteractionType.Transition) ||
  (bibleData && bibleData.currentState !== BibleState.Open) ||
  !piece.masks.highlightable
)
  return;

if (piece.masks.isUnhighlighting) {
  piece.StopHighlightTransition();
}
if (currentUnhighlightDelayInfo) {
  thisBot.ClearUnhighlightDelay({
    unhighlightDelayInfo: currentUnhighlightDelayInfo,
    unhighlightDelayInfoIndex: currentUnhighlightDelayInfoIndex,
  });
}
if (delay) {
  delay /= speedMultiplier;
  const timeoutId = setTimeout(() => {
    if (piece.tags.isInUse) {
      const { unhighlightDelayInfo, unhighlightDelayInfoIndex } =
        thisBot.GetUnhighlightDelayInfo({ piece });
      thisBot.ClearUnhighlightDelay({
        unhighlightDelayInfo,
        unhighlightDelayInfoIndex,
      });
      piece.StopHighlightTransition();
      piece
        .Unhighlight({ customDuration, isInstantaneous, speedMultiplier })
        .then(() => {
          thisBot.RemovePieceFromHighlightedList({ piece });
          if (tryUpdateActivityNotification && data instanceof StackChapterData)
            updateNotification(data, thisBot.tags.activityNotificationOffset, {
              x: thisBot.tags.activityNotificationScaleX,
              y: thisBot.tags.activityNotificationScaleY,
            });
        });
    }
  }, delay);
  const unhighlightDelayInfo: UnhighlightDelayInfo = { piece, timeoutId };
  thisBot.vars.unhighlightDelaysInfo.push(unhighlightDelayInfo);
} else {
  piece.StopHighlightTransition();
  await piece
    .Unhighlight({ customDuration, speedMultiplier, isInstantaneous })
    .then(() => {
      thisBot.RemovePieceFromHighlightedList({ piece });
      if (tryUpdateActivityNotification && data instanceof StackChapterData)
        updateNotification(data, thisBot.tags.activityNotificationOffset, {
          x: thisBot.tags.activityNotificationScaleX,
          y: thisBot.tags.activityNotificationScaleY,
        });
    });
}
