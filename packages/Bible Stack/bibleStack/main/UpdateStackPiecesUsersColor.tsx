const availableChaptersData = thisBot.vars.stackChaptersData.filter(
  (chapterData: any) => {
    return (
      chapterData.piece &&
      chapterData.piece.tags.isInUse &&
      chapterData.piece.masks.isExpanded &&
      !chapterData.piece.masks.isDeselecting &&
      !chapterData.piece.masks.isSelecting
    );
  }
);
const availableInfoLabelTransformers = getBots(
  byTag("isInfoLabelTransformer", true),
  byTag("isInUse", true)
).filter((labelTransformer) => {
  return (
    labelTransformer?.links?.ownerBot?.tags?.typeOfPiece &&
    (labelTransformer.links.ownerBot.tags.typeOfPiece ===
      BibleVizUtils.Data.tags.BiblePieceType.StackTestament ||
      labelTransformer.links.ownerBot.tags.typeOfPiece ===
        BibleVizUtils.Data.tags.BiblePieceType.StackSection ||
      labelTransformer.links.ownerBot.tags.typeOfPiece ===
        BibleVizUtils.Data.tags.BiblePieceType.StackSectionShadow ||
      labelTransformer.links.ownerBot.tags.typeOfPiece ===
        BibleVizUtils.Data.tags.BiblePieceType.StackBook ||
      labelTransformer.links.ownerBot.tags.typeOfPiece ===
        BibleVizUtils.Data.tags.BiblePieceType.StackChapter)
  );
});
const availablePiecesData = [...availableChaptersData];
const availablePieces = [
  ...availablePiecesData.map((pieceData) => {
    return pieceData.piece;
  }),
  ...availableInfoLabelTransformers,
];

BibleVizUtils.Functions.UpdateUsersColorOnPiece({
  source: "UpdateStackPiecesUsersColor",
  pieces: availablePieces,
  manager: thisBot,
});
