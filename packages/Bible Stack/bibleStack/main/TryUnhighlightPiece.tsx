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

import { UnhighlightDelayInfo } from "bibleStack.main.UnhighlightDelayInfo";

let { delay } = that;
const {
  piece,
  tryUpdateActivityNotification = true,
  requestSource,
  customDuration,
  speedMultiplier = 1,
  isInstantaneous = false,
} = that;

const data = thisBot.GetPieceData({ piece });
const { bibleData } = thisBot.GetDataChainFromParentDataIds({
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
  (bibleData &&
    bibleData.currentState !== BibleVizUtils.Data.tags.BibleState.Open) ||
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
          if (tryUpdateActivityNotification)
            BibleVizUtils.Functions.UpdateActivityNotificationOnPieces({
              piecesData: [data],
              manager: thisBot,
            });
        });
    }
  }, delay);
  thisBot.vars.unhighlightDelaysInfo.push(
    new UnhighlightDelayInfo({ piece, timeoutId })
  );
} else {
  piece.StopHighlightTransition();
  await piece
    .Unhighlight({ customDuration, speedMultiplier, isInstantaneous })
    .then(() => {
      thisBot.RemovePieceFromHighlightedList({ piece });
      if (tryUpdateActivityNotification)
        BibleVizUtils.Functions.UpdateActivityNotificationOnPieces({
          piecesData: [data],
          manager: thisBot,
        });
    });
}
