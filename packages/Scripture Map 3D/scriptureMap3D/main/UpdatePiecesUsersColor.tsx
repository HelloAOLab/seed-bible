const availablechaptersData = thisBot.vars.layoutChaptersData.filter(
  (chapterData) => {
    return (
      chapterData.piece &&
      chapterData.piece.tags.isInUse &&
      chapterData.piece.masks.isExpanded &&
      !chapterData.piece.masks.isDeselecting &&
      !chapterData.piece.masks.isSelecting
    );
  }
);
const availableLayoutBooksData = thisBot.vars.layoutBooksData.filter(
  (layoutBookData) => {
    return layoutBookData.piece && !layoutBookData.isSelected;
  }
);
const availablePiecesData = [
  ...availablechaptersData,
  ...availableLayoutBooksData,
];
const availablePieces = availablePiecesData.map((pieceData) => {
  return pieceData.piece;
});

BibleVizUtils.Functions.UpdateUsersColorOnPiece({
  source: "UpdatePiecesUsersColor",
  pieces: availablePieces,
  manager: thisBot,
});
