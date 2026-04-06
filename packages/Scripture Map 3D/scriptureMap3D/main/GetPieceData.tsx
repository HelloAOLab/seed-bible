import { BiblePiece } from "bibleVizUtils.models.canvas";

const { piece } = that;
let data;

switch (piece.tags.typeOfPiece) {
  case BiblePiece.LayoutBook:
    data = thisBot.vars.layoutBooksData.find((data) => {
      return data.isActive && data.piece?.id === piece.id;
    });
    break;
  case BiblePiece.LayoutChapter:
    data = thisBot.vars.layoutChaptersData.find((data) => {
      return data.isActive && data.piece.id === piece.id;
    });
    break;
  default:
    break;
}

return data;
