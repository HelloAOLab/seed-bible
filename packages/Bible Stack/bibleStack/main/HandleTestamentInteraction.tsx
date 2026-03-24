/**
 * This tag is called whenever a testament is interacted by clicking or hovering it
 * It is in charge of managing whether to highlight or select a testament
 * @param {Object} that - Object that contains important data for the function
 * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found on interactiveBible.managers.StackManager.DefineGlobals on CanvasInteractions
 * @param {Object} that.dragEvent? - Is optional and is the information received when the type of interaction is a drag
 * @param {Object} that.dropEvent? - Is optional and is the information received when the type of interaction is a drop
 * @example
 * thisBot.HandleTestamentInteraction({testament: someTestament, typeOfInteraction: CanvasInteractions.Drag, dragEvent: someDragInfo});
 */

import { BibleState, BiblePiece } from "bibleVizUtils.models.canvas";
import {
  CanvasInteractions,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { DraggingEvent, DropEvent } from "bibleVizUtils.models.casualos";

const {
  testament,
  typeOfInteraction,
  draggingEvent,
  dropEvent,
}: {
  testament: Bot;
  typeOfInteraction: CanvasInteraction;
  dropEvent?: DropEvent;
  draggingEvent?: DraggingEvent;
} = that;

if (
  thisBot.masks.isBibleAnimating &&
  typeOfInteraction !== CanvasInteractions.PointerUp
)
  return;

const testamentData: StackTestamentData | undefined = thisBot.GetPieceData({
  piece: testament,
});

if (!testamentData) {
  throw new Error("HandleTestamentInteraction: testamentData not found.");
}

const { bibleData } = await (thisBot.GetDataChainFromParentDataIds({
  parentDataIds: testamentData.parentDataIds,
}) as Promise<{ bibleData: StackBibleData | undefined }>);

if (
  (bibleData && bibleData.currentState !== BibleState.Open) ||
  thisBot.masks.isASectionMakingTourGuide
) {
  return;
}

switch (typeOfInteraction) {
  case CanvasInteractions.Click:
    {
      if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
        BibleVizUtils.Functions.HighlightBiblePiece({
          data: testamentData,
        });
      } else {
        if (testament.tags.isHighlighted) {
          thisBot.SelectTestament({
            testament,
            source: "HandleTestamentInteraction",
          });
        } else {
          thisBot.TryHighlightPiece({
            piece: testament,
            highlightRequestSource: CanvasInteractions.Click,
            typeOfPiece: BiblePiece.StackTestament,
          });
        }
      }
    }
    break;
  case CanvasInteractions.Tap:
    {
      if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
        BibleVizUtils.Functions.HighlightBiblePiece({
          data: testamentData,
        });
      } else {
        thisBot.SelectTestament({
          testament,
          source: "HandleTestamentInteraction",
        });
      }
    }
    break;
  case CanvasInteractions.HoverBegin:
    {
      thisBot.TryHighlightPiece({
        piece: testament,
        highlightRequestSource: CanvasInteractions.HoverBegin,
        typeOfPiece: BiblePiece.StackTestament,
      });
    }
    break;
  case CanvasInteractions.Drag:
    {
      if (testament.tags.draggable)
        shout("OnStackPieceDrag", {
          piece: testament,
          data: testamentData,
        });
    }
    break;
  case CanvasInteractions.Dragging:
    {
      if (testament.tags.draggable)
        shout("OnStackPieceDragging", { piece: testament, draggingEvent });
    }
    break;
  case CanvasInteractions.Drop:
    {
      if (testament.tags.draggable)
        shout("OnStackPieceDrop", { piece: testament, dropEvent });
    }
    break;
  case CanvasInteractions.PointerUp:
    {
      if (testament.tags.draggable)
        shout("OnStackPiecePointerUp", { piece: testament });
    }
    break;
  // case CanvasInteractions.SearchBarSelection:
  // {
  //     return thisBot.SelectTestament({testament});
  // }
  default:
    break;
}
