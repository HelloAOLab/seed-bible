import { LayoutBookData } from "bibleVizUtils.models.entities.LayoutBookData";
import { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";

const piecesData = [
  ...(thisBot.vars.layoutBooksData as LayoutBookData[]),
  ...(thisBot.vars.layoutChaptersData as LayoutChapterData[]),
];

for (const pieceData of piecesData) {
  const isPieceAvailable =
    pieceData.piece &&
    pieceData.piece.tags.isInUse &&
    (pieceData instanceof LayoutBookData ? !pieceData.isSelected : true);
  if (!isPieceAvailable) continue;

  const color = BibleVizUtils.Functions.GetHistoryColor({
    piece: pieceData.piece,
  });
  setTagMask(pieceData.piece, "color", color);

  if (
    !(pieceData instanceof LayoutChapterData) ||
    !(
      pieceData.isSelected &&
      Array.isArray(pieceData.piece.vars.chunksOfVerses) &&
      pieceData.piece.vars.chunksOfVerses.length > 0
    )
  )
    continue;

  pieceData.piece.vars.chunksOfVerses.forEach((chunk) => {
    if (chunk.masks.isSelected) {
      if (Array.isArray(chunk.vars.verses) && chunk.vars.verses.length > 0) {
        chunk.vars.verses.forEach((verse) => {
          setTagMask(
            verse,
            "color",
            BibleVizUtils.Functions.GetHistoryColor({ piece: verse })
          );
        });
      }
    } else {
      setTagMask(
        chunk,
        "color",
        BibleVizUtils.Functions.GetHistoryColor({ piece: chunk })
      );
    }
  });
}
