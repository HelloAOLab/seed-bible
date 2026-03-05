const { piece } = that;
let data;

switch (piece.tags.typeOfPiece) {
  case BibleVizUtils.Data.tags.BiblePieceType.LayoutBook:
    data = thisBot.vars.layoutBooksData.find((data: any) => {
      return data.isActive && data.piece?.id === piece.id;
    });
    break;
  case BibleVizUtils.Data.tags.BiblePieceType.LayoutChapter:
    data = thisBot.vars.layoutChaptersData.find((data: any) => {
      return data.isActive && data.piece.id === piece.id;
    });
    break;
  default:
    break;
}

return data;
