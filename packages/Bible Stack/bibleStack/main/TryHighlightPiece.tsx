import {
  BiblePiece,
  BibleState,
  type BiblePieceType,
  type UnhighlightDelayInfo,
} from "bibleVizUtils.models.canvas";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
/**
 * Highlights a Bible piece if possible
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.piece - The bot to be highlgihted
 * @param {String} that.highlightRequestSource - The source the highlight request comes from. Available values can be found at globalThis.CanvasInteractions
 * @param {Number} that.unhighlightDelay - Is optional and is a delay in miliseconds before unhighlighting the piece
 * @param {String} that.typeOfPiece - The type of piece. Available values can be found at BiblePiece
 * @param {Number} that.customUnhighlightDuration? - Is optional and is a custom duration for the unhighlight animation
 * @example
 * shout("TryHighlightPiece", {piece: section, highlightRequestSource: CanvasInteractions.Click, unhighlightDelay: 4000, typeOfPiece: BiblePiece.StackTestament, customUnhighlightDuration: 1});
 */
import {
  CanvasInteractions,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";

const {
  piece,
  highlightRequestSource,
  unhighlightDelay,
  typeOfPiece,
  customUnhighlightDuration,
  speedMultiplier = 1,
  isInstantaneous = false,
}: {
  piece: Bot;
  highlightRequestSource: CanvasInteraction;
  unhighlightDelay?: number;
  typeOfPiece: BiblePieceType;
  customUnhighlightDuration?: number;
  speedMultiplier?: number;
  isInstantaneous?: boolean;
} = that;

const { unhighlightDelayInfo, unhighlightDelayInfoIndex } =
  await (thisBot.GetUnhighlightDelayInfo({ piece }) as Promise<{
    unhighlightDelayInfo: UnhighlightDelayInfo | undefined;
    unhighlightDelayInfoIndex: number | undefined;
  }>);
const data = await (thisBot.GetPieceData({ piece }) as Promise<
  | StackTestamentData
  | StackSectionData
  | StackSectionBookData
  | StackBookData
  | StackChapterData
  | undefined
>);

if (!data) {
  throw new Error("TryHighlightPiece: data not found.");
}

const { bibleData } = await (thisBot.GetDataChainFromParentDataIds({
  parentDataIds: data.parentDataIds,
}) as Promise<{ bibleData: StackBibleData | undefined }>);

if (
  (thisBot.IsBiblePieceHighlighted({ piece }) &&
    !unhighlightDelayInfo &&
    !piece.masks.isUnhighlighting) ||
  (thisBot.masks.isBibleAnimating &&
    highlightRequestSource !== CanvasInteractions.Transition) ||
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
          data.getParentId("stackBibleId") &&
          highlightRequestSource !== CanvasInteractions.Transition
        ) {
          const otherBotsToUnhighlight = (
            thisBot.vars.highlightedPieces as Bot[]
          ).filter((currentPiece) => {
            return (
              currentPiece !== piece &&
              !currentPiece.masks.isOnTheGround &&
              !currentPiece.masks.isUnhighlighting &&
              currentPiece.tags.typeOfPiece === BiblePiece.StackTestament &&
              thisBot.ArePiecesOnSameStack({ pieces: [currentPiece, piece] })
            );
          });

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
      case CanvasInteractions.HoverBegin:
        if (!piece.masks.isBeingHovered)
          thisBot.TryUnhighlightPiece({
            piece,
            delay: 2000,
            customDuration: customUnhighlightDuration,
          });
        break;
      case CanvasInteractions.Click:
      case CanvasInteractions.Tap:
        if (unhighlightDelay && !piece.masks.isBeingHovered)
          thisBot.TryUnhighlightPiece({
            piece,
            delay: unhighlightDelay,
            customDuration: customUnhighlightDuration,
          });
        break;
      case CanvasInteractions.GridClick:
        if (unhighlightDelay)
          thisBot.TryUnhighlightPiece({
            piece,
            delay: unhighlightDelay,
            customDuration: customUnhighlightDuration,
          });
        break;
      case CanvasInteractions.Transition:
        thisBot.TryUnhighlightPiece({
          piece,
          delay: unhighlightDelay ?? 4000,
          requestSource: CanvasInteractions.Transition,
          customDuration: customUnhighlightDuration,
        });
        break;
    }
  });
}
