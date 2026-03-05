import { LayoutBookData } from "bibleVizUtils.classes.LayoutBookData";
import { LayoutChapterData } from "bibleVizUtils.classes.LayoutChapterData";

const piecesData = [
  ...thisBot.vars.layoutBooksData,
  ...thisBot.vars.layoutChaptersData,
];

piecesData.forEach((pieceData) => {
  const isPieceAvailable =
    pieceData.piece &&
    pieceData.piece.tags.isInUse &&
    (pieceData instanceof LayoutBookData ? !pieceData.isSelected : true);

  if (isPieceAvailable) {
    if (pieceData instanceof LayoutChapterData && pieceData.isSelected) {
      const layoutData = thisBot.GetLayoutDataById({
        layoutId: pieceData.parentDataIds.layoutId,
      });
      setTagMask(
        pieceData.piece,
        "color",
        pieceData.isSelected && !pieceData.piece.masks.isExpanded
          ? layoutData.chapterSelectColor
          : (pieceData.highlightColor ?? pieceData.piece.tags.initialColor)
      );

      if (
        Array.isArray(pieceData.piece.vars.chunksOfVerses) &&
        pieceData.piece.vars.chunksOfVerses.length > 0
      ) {
        pieceData.piece.vars.chunksOfVerses.forEach((chunk: any) => {
          if (chunk.masks.isSelected) {
            if (
              Array.isArray(chunk.vars.verses) &&
              chunk.vars.verses.length > 0
            ) {
              chunk.vars.verses.forEach((verse: any) => {
                const verseHighlightInfo = pieceData.GetHighlightInfoByKey(
                  verse.masks.versePath
                );
                setTagMask(
                  verse,
                  "color",
                  verseHighlightInfo
                    ? verseHighlightInfo.color
                    : verse.tags.initialColor
                );
              });
            }
          } else {
            const chunkHighlightInfo = pieceData.GetHighlightInfoByKey(
              chunk.masks.chunkPath
            );
            setTagMask(
              chunk,
              "color",
              chunkHighlightInfo
                ? chunkHighlightInfo.color
                : chunk.tags.initialColor
            );
          }
        });
      }
    } else {
      setTagMask(
        pieceData.piece,
        "color",
        pieceData.highlightColor ?? pieceData.piece.tags.initialColor
      );
    }
  }
});
