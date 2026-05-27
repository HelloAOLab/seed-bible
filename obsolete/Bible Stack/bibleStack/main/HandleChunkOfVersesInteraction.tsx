/**
 * Called whenever a chunk of verses is interacted
 * It is in charge of managing whether to select, highlight, unhighlight a chunk of verses if possible.
 * @param {Object} that - Object that contains important data for the function
 * @param {String} that.typeOfInteraction - The type of interaction made. Available values can be found at globalThis.CanvasInteractions
 * @example
 * shout("HandleChunkOfVersesInteraction", {typeOfInteraction: CanvasInteractions.Click});
 */

import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import {
  CanvasInteractions,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";

const {
  typeOfInteraction,
  chunk,
}: {
  typeOfInteraction: CanvasInteraction;
  chunk: Bot;
} = that;
if (thisBot.masks.isBibleAnimating) return;

switch (typeOfInteraction) {
  case CanvasInteractions.Click:
    {
      if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
        BibleVizUtils.Functions.HighlightBiblePiece({ piece: chunk });
      } else {
        if (!chunk.masks.isSelected) {
          shout("OnBiblePieceSelected", { piece: chunk });
          setTagMask(thisBot, "isBibleAnimating", true);
          await chunk.Select();
          setTagMask(thisBot, "isBibleAnimating", false);
        }
      }
    }
    break;
  case CanvasInteractions.HoverBegin:
    {
      if (!chunk.masks.isSelected && !chunk.masks.isBeingDragged)
        chunk.Highlight();
    }
    break;
  case CanvasInteractions.HoverEnd:
    {
      if (!chunk.masks.isSelected && !chunk.masks.isBeingDragged)
        chunk.Unhighlight();
    }
    break;
  default:
    break;
}
