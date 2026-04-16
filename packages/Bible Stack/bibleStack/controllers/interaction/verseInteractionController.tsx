import type { BibleStackEvents } from "bibleStack.models.events";

export function HandleVerseClick({ verse }: BibleStackEvents["OnVerseClick"]) {
  if (thisBot.masks.isBibleAnimating) return;

  if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
    BibleVizUtils.Functions.HighlightBiblePiece({ piece: verse });
  } else {
    shout("OnBiblePieceSelected", { piece: verse });
  }
}
