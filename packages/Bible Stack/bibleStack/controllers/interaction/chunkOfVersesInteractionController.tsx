import type { BibleStackEvents } from "bibleStack.models.events";

export function HandleChunkOfVersesClick({
  chunkOfVerses,
}: BibleStackEvents["OnChunkOfVersesClick"]) {
  if (thisBot.masks.isBibleAnimating) return;

  if (BibleVizUtils.Data.masks.isHighlightToolEnabled) {
    BibleVizUtils.Functions.HighlightBiblePiece({ piece: chunkOfVerses });
  } else {
    if (!chunkOfVerses.masks.isSelected) {
      shout("OnBiblePieceSelected", { piece: chunkOfVerses });
      setTagMask(thisBot, "isBibleAnimating", true);
      await chunkOfVerses.Select();
      setTagMask(thisBot, "isBibleAnimating", false);
    }
  }
}

export function HandleChunkOfVersesPointerEnter({
  chunkOfVerses,
}: BibleStackEvents["OnChunkOfVersesPointerEnter"]) {
  if (
    thisBot.masks.isBibleAnimating ||
    chunkOfVerses.masks.isSelected ||
    chunkOfVerses.masks.isBeingDragged
  )
    return;

  chunkOfVerses.Highlight();
}

export function HandleChunkOfVersesPointerExit({
  chunkOfVerses,
}: BibleStackEvents["OnChunkOfVersesPointerExit"]) {
  if (
    thisBot.masks.isBibleAnimating ||
    chunkOfVerses.masks.isSelected ||
    chunkOfVerses.masks.isBeingDragged
  )
    return;

  chunkOfVerses.Unhighlight();
}
