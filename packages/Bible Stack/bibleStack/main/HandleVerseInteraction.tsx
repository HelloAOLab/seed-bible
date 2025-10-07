const { typeOfInteraction, verse } = that;
if (thisBot.masks.isBibleAnimating) return;

switch (typeOfInteraction) {
  case BibleVizUtils.Data.tags.InteractionType.Click:
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
