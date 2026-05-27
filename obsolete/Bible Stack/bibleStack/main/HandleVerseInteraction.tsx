import {
  CanvasInteractions,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

const {
  typeOfInteraction,
  verse,
}: {
  typeOfInteraction: CanvasInteraction;
  verse: Bot;
} = that;

if (thisBot.masks.isBibleAnimating) return;

switch (typeOfInteraction) {
  case CanvasInteractions.Click:
    {
      if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
        BibleVizUtils.Functions.HighlightBiblePiece({ piece: verse });
      } else {
        shout("OnBiblePieceSelected", { piece: verse });
      }
    }
    break;
  default:
    break;
}
