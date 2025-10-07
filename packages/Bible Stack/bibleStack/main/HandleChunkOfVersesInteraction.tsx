/**
 * Called whenever a chunk of verses is interacted
 * It is in charge of managing whether to select, highlight, unhighlight a chunk of verses if possible.
 * @param {Object} that - Object that contains important data for the function
 * @param {String} that.typeOfInteraction - The type of interaction made. Available values can be found at globalThis.BibleVizUtils.Data.tags.InteractionType
 * @example
 * shout("HandleChunkOfVersesInteraction", {typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Click});
 */

const { typeOfInteraction, chunk } = that;
if (thisBot.masks.isBibleAnimating) return;

switch (typeOfInteraction) {
  case BibleVizUtils.Data.tags.InteractionType.Click:
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
  case BibleVizUtils.Data.tags.InteractionType.HoverBegin:
    {
      if (!chunk.masks.isSelected && !chunk.masks.isBeingDragged)
        chunk.Highlight();
    }
    break;
  case BibleVizUtils.Data.tags.InteractionType.HoverEnd:
    {
      if (!chunk.masks.isSelected && !chunk.masks.isBeingDragged)
        chunk.Unhighlight();
    }
    break;
  default:
    break;
}
