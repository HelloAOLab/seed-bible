import { BiblePiece, BibleState } from "bibleVizUtils.models.canvas";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
/**
 * Highlights a Bible piece if possible
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.piece - The bot to be highlgihted
 * @param {String} that.highlightRequestSource - The source the highlight request comes from. Available values can be found at globalThis.BibleVizUtils.Data.tags.InteractionType
 * @param {Number} that.unhighlightDelay - Is optional and is a delay in miliseconds before unhighlighting the piece
 * @param {String} that.typeOfPiece - The type of piece. Available values can be found at globalThis.BibleVizUtils.Data.tags.BiblePieceType
 * @param {Number} that.customUnhighlightDuration? - Is optional and is a custom duration for the unhighlight animation
 * @example
 * shout("TryHighlightPiece", {piece: section, highlightRequestSource: BibleVizUtils.Data.tags.InteractionType.Click, unhighlightDelay: 4000, typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackTestament, customUnhighlightDuration: 1});
 */

const {
  piece,
  highlightRequestSource,
  unhighlightDelay,
  typeOfPiece,
  customUnhighlightDuration,
  speedMultiplier = 1,
  isInstantaneous = false,
} = that;

const { unhighlightDelayInfo, unhighlightDelayInfoIndex } =
  thisBot.GetUnhighlightDelayInfo({ piece });
const data = thisBot.GetPieceData({ piece });
const { bibleData } = await thisBot.GetDataChainFromParentDataIds({
  parentDataIds: data.parentDataIds,
});

if (
  (thisBot.IsBiblePieceHighlighted({ piece }) &&
    !unhighlightDelayInfo &&
    !piece.masks.isUnhighlighting) ||
  (thisBot.masks.isBibleAnimating &&
    highlightRequestSource !==
      BibleVizUtils.Data.tags.InteractionType.Transition) ||
  (bibleData && bibleData.currentState !== BibleState.Open) ||
  !piece.masks.highlightable
)
  return;

switch (typeOfPiece) {
  case BiblePiece.StackBook:
    thisBot.vars.lastInteractedStackBookData = data;
    break;
  case BiblePiece.StackSection:
    thisBot.vars.lastInteractedStackSectionData = data;
    break;
  case BiblePiece.StackTestament:
    thisBot.vars.lastInteractedStackTestamentData = data;
}

if (unhighlightDelayInfo) {
  if (typeOfPiece === BiblePiece.StackBook) {
    thisBot.TryIncreasePieceHighlight({
      piece,
      speedMultiplier,
      isInstantaneous,
    });
  }
  thisBot.ClearUnhighlightDelay({
    unhighlightDelayInfo,
    unhighlightDelayInfoIndex,
  });
} else {
  let highlightAction;
  if (piece.masks.isUnhighlighting) {
    piece.StopHighlightTransition();
    highlightAction = piece.Rehighlight({ speedMultiplier, isInstantaneous });
  } else {
    thisBot.vars.highlightedPieces.push(piece);
    tryHideNotification(piece);
    highlightAction = piece.Highlight({ speedMultiplier, isInstantaneous });
  }

  switch (typeOfPiece) {
    case BiblePiece.StackTestament:
      {
        if (
          data.parentDataIds.stackBibleId &&
          highlightRequestSource !==
            BibleVizUtils.Data.tags.InteractionType.Transition
        ) {
          const otherBotsToUnhighlight = thisBot.vars.highlightedPieces.filter(
            (currentPiece) => {
              return (
                currentPiece !== piece &&
                !currentPiece.masks.isOnTheGround &&
                !currentPiece.masks.isUnhighlighting &&
                currentPiece.tags.typeOfPiece === BiblePiece.StackTestament &&
                thisBot.ArePiecesOnSameStack({ pieces: [currentPiece, piece] })
              );
            }
          );

          if (otherBotsToUnhighlight.length > 0) {
            otherBotsToUnhighlight.forEach((piece) => {
              thisBot.TryUnhighlightPiece({
                piece,
                speedMultiplier,
                isInstantaneous,
              });
            });
          }
        }
      }
      break;
    default:
      break;
  }

  await highlightAction.then(() => {
    switch (highlightRequestSource) {
      case BibleVizUtils.Data.tags.InteractionType.HoverBegin:
        if (!piece.masks.isBeingHovered)
          thisBot.TryUnhighlightPiece({
            piece,
            delay: 2000,
            customDuration: customUnhighlightDuration,
          });
        break;
      case BibleVizUtils.Data.tags.InteractionType.Click:
      case BibleVizUtils.Data.tags.InteractionType.Tap:
        if (unhighlightDelay && !piece.masks.isBeingHovered)
          thisBot.TryUnhighlightPiece({
            piece,
            delay: unhighlightDelay,
            customDuration: customUnhighlightDuration,
          });
        break;
      case BibleVizUtils.Data.tags.InteractionType.GridClick:
        if (unhighlightDelay)
          thisBot.TryUnhighlightPiece({
            piece,
            delay: unhighlightDelay,
            customDuration: customUnhighlightDuration,
          });
        break;
      case BibleVizUtils.Data.tags.InteractionType.Transition:
        thisBot.TryUnhighlightPiece({
          piece,
          delay: unhighlightDelay ?? 4000,
          requestSource: BibleVizUtils.Data.tags.InteractionType.Transition,
          customDuration: customUnhighlightDuration,
        });
        break;
    }
  });
}
