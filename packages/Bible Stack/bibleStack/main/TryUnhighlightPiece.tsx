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
import { BiblePiece, BibleState } from "bibleVizUtils.models.canvas";
import {
  CanvasInteractions,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

let { delay } = that;
const {
  piece,
  tryUpdateActivityNotification = true,
  requestSource,
  customDuration,
  speedMultiplier = 1,
  isInstantaneous = false,
}: {
  piece: Bot;
  tryUpdateActivityNotification?: boolean;
  requestSource: CanvasInteraction;
  customDuration?: number;
  speedMultiplier?: number;
  isInstantaneous?: boolean;
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

const { unhighlightDelayInfo: currentUnhighlightDelayInfo } =
  await (thisBot.GetUnhighlightDelayInfo({ piece }) as Promise<{
    unhighlightDelayInfo: UnhighlightDelayInfo | undefined;
  }>);

if (
  !thisBot.IsBiblePieceHighlighted({ piece }) ||
  ((piece.masks.isUnhighlighting || thisBot.masks.isBibleAnimating) &&
    requestSource !== CanvasInteractions.Transition) ||
  (bibleData && bibleData.currentState !== BibleState.Open) ||
  !piece.masks.highlightable
) {
  return;
}

if (piece.masks.isUnhighlighting) {
  await piece.StopHighlightTransition();
}
if (currentUnhighlightDelayInfo) {
  await thisBot.ClearUnhighlightDelay({
    unhighlightDelayInfo: currentUnhighlightDelayInfo,
  });
}
if (delay) {
  delay /= speedMultiplier;
  const timeoutId = setTimeout(async () => {
    if (piece.tags.isInUse) {
      const { unhighlightDelayInfo } = await thisBot.GetUnhighlightDelayInfo({
        piece,
      });
      await thisBot.ClearUnhighlightDelay({
        unhighlightDelayInfo,
      });
      await piece.StopHighlightTransition();
      await piece
        .Unhighlight({ customDuration, isInstantaneous, speedMultiplier })
        .then(async () => {
          await thisBot.RemovePieceFromHighlightedList({ piece });
          if (tryUpdateActivityNotification && data instanceof StackChapterData)
            updateNotification(data, thisBot.tags.activityNotificationOffset, {
              x: thisBot.tags.activityNotificationScaleX,
              y: thisBot.tags.activityNotificationScaleY,
            });
        });
    }
  }, delay);
  const unhighlightDelayInfo: UnhighlightDelayInfo = { piece, timeoutId };
  (
    thisBot.vars.unhighlightDelaysInfo as Map<Bot["id"], UnhighlightDelayInfo>
  ).set(piece.id, unhighlightDelayInfo);
} else {
  await piece.StopHighlightTransition();
  await piece
    .Unhighlight({ customDuration, speedMultiplier, isInstantaneous })
    .then(async () => {
      await thisBot.RemovePieceFromHighlightedList({ piece });
      if (tryUpdateActivityNotification && data instanceof StackChapterData)
        updateNotification(data, thisBot.tags.activityNotificationOffset, {
          x: thisBot.tags.activityNotificationScaleX,
          y: thisBot.tags.activityNotificationScaleY,
        });
    });
}
