/**
 * This tag is called whenever a section is interacted by clicking or hovering it
 * It is in charge of managing whether to highlight or select a section
 * @param {Object} that - Object that contains important data for the function
 * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found at globalThis.CanvasInteractions
 * @param {Object} that.dragEvent? - Is optional and is the information received when the type of interaction is a drag
 * @param {Object} that.dropEvent? - Is optional and is the information received when the type of interaction is a drop
 * @example
 * thisBot.HandleSectionInteraction({section: someSection, typeOfInteraction: CanvasInteractions.Drag, dragEvent: someDraginfo});
 */

import { BiblePiece, BibleState } from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import {
  CanvasInteractions,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";
import type { DraggingEvent, DropEvent } from "bibleVizUtils.models.casualos";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/models/entities/StackBibleData";

const {
  section,
  typeOfInteraction,
  draggingEvent,
  dropEvent,
}: {
  section: Bot;
  typeOfInteraction: CanvasInteraction;
  dropEvent?: DropEvent;
  draggingEvent?: DraggingEvent;
} = that;

if (
  thisBot.masks.isBibleAnimating &&
  typeOfInteraction !== CanvasInteractions.PointerUp
)
  return;
const sectionData = await (thisBot.GetPieceData({ piece: section }) as Promise<
  StackSectionData | undefined
>);

if (!sectionData) {
  throw new Error("HandleSectionInteraction: sectionData not found");
}

const { bibleData } = await (thisBot.GetDataChainFromParentDataIds({
  parentDataIds: sectionData.parentDataIds,
}) as Promise<{ bibleData: StackBibleData | undefined }>);

if (bibleData?.currentState === BibleState.Closed) {
  console.warn(
    "HandleSectionInteraction: Unable to interact, bible is closed."
  );
  return;
}

if (thisBot.masks.isASectionMakingTourGuide) {
  console.warn(
    "HandleSectionInteraction: Unable to interact, a section is making a tour guide."
  );
  return;
}
switch (typeOfInteraction) {
  case CanvasInteractions.Click:
    {
      if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
        BibleVizUtils.Functions.HighlightBiblePiece({ data: sectionData });
      } else {
        if (section.masks.isHighlighted) {
          if (!sectionData.isSplitIntoBooks) {
            thisBot.SelectSection({ section });
          }
        } else {
          thisBot.TryHighlightPiece({
            piece: section,
            highlightRequestSource: CanvasInteractions.Click,
            typeOfPiece: BiblePiece.StackSection,
          });
        }
      }
    }
    break;
  case CanvasInteractions.Tap:
    {
      if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
        BibleVizUtils.Functions.HighlightBiblePiece({ data: sectionData });
      } else {
        thisBot.SelectSection({ section });
      }
    }
    break;
  case CanvasInteractions.HoverBegin:
    {
      thisBot.TryHighlightPiece({
        piece: section,
        highlightRequestSource: CanvasInteractions.HoverBegin,
        typeOfPiece: BiblePiece.StackSection,
      });
    }
    break;
  case CanvasInteractions.HoverEnd:
    {
      thisBot.TryUnhighlightPiece({
        piece: section,
        delay: 4000,
        requestSource: CanvasInteractions.HoverEnd,
      });
    }
    break;
  // case CanvasInteractions.SearchBarSelection:
  // {
  //     return thisBot.SelectSection({section});
  // }
  case CanvasInteractions.Drag:
    {
      if (section.tags.draggable)
        shout("OnStackPieceDrag", { piece: section, data: sectionData });
    }
    break;
  case CanvasInteractions.Dragging:
    {
      if (section.tags.draggable)
        shout("OnStackPieceDragging", { piece: section, draggingEvent });
    }
    break;
  case CanvasInteractions.Drop:
    {
      if (section.tags.draggable)
        shout("OnStackPieceDrop", { piece: section, dropEvent });
    }
    break;
  case CanvasInteractions.PointerUp:
    {
      if (section.tags.draggable)
        shout("OnStackPiecePointerUp", { piece: section });
    }
    break;
  default:
    break;
}
