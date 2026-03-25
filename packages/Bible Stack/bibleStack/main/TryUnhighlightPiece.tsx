/**
 * Unhighlights a Bible piece if possible
 *
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.piece - The bot to be unhighlgihted
 * @param {Number} that.delay - Is optional and is a delay before unhighlighting the bot
 * @param {String} that.requestSource? - Is optional and is the source of the unhighlight request. Available values can be found at globalThis.CanvasInteractions
 * @param {Number} that.customDuration? - Is optional and is a custom duration for the unhighlight animation
 *
 * @example
 * shout("TryUnhighlightPiece", {piece: someBot, delay: 4000, requestSource: CanvasInteractions.Transition, customDuration: 1});
 */

import type { UnhighlightDelayInfo } from "bibleVizUtils.models.canvas";
import { updateNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { BibleState } from "bibleVizUtils.models.canvas";
import {
  CanvasInteractions,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";

let { delay } = that;
const {
  piece,
  tryUpdateActivityNotification = true,
  requestSource,
  customDuration,
  speedMultiplier = 1,
  isInstantaneous = false,
} = that;

const data = await (thisBot.GetPieceData({ piece }) as Promise<
  | StackTestamentData
  | StackSectionData
  | StackSectionBookData
  | StackBookData
  | StackChapterData
  | undefined
>);

if (!data) {
  throw new Error(`TryUnhighlightPiece: data not found.`);
}

const { bibleData } = await (thisBot.GetDataChainFromParentDataIds({
  parentDataIds: data.parentDataIds,
}) as Promise<{ bibleData: StackBibleData | undefined }>);

const {
  unhighlightDelayInfo: currentUnhighlightDelayInfo,
  unhighlightDelayInfoIndex: currentUnhighlightDelayInfoIndex,
} = await (thisBot.GetUnhighlightDelayInfo({ piece }) as Promise<{
  unhighlightDelayInfo: UnhighlightDelayInfo | undefined;
  unhighlightDelayInfoIndex: number | undefined;
}>);

if (
  !thisBot.IsBiblePieceHighlighted({ piece }) ||
  ((piece.masks.isUnhighlighting || thisBot.masks.isBibleAnimating) &&
    requestSource !== CanvasInteractions.Transition) ||
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
