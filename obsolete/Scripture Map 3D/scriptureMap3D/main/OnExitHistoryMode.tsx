import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";
import { LayoutBookData } from "bibleVizUtils.models.entities.LayoutBookData";
import { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";

const piecesData = [
  ...(thisBot.vars.layoutBooksData as LayoutBookData[]),
  ...(thisBot.vars.layoutChaptersData as LayoutChapterData[]),
];

piecesData.forEach((pieceData) => {
  const isPieceAvailable =
    pieceData.piece &&
    pieceData.piece.tags.isInUse &&
    (pieceData instanceof LayoutBookData ? !pieceData.isSelected : true);

  if (isPieceAvailable) {
    if (pieceData instanceof LayoutChapterData) {
      const layoutData: LayoutBibleData | undefined = thisBot.GetLayoutDataById(
        { layoutId: pieceData.parentDataIds.layoutId }
      );
      if (!layoutData) {
        console.warn("layoutData not found a OnExitHistoryMode");
        return;
      }
      if (pieceData.isSelected)
        setTagMask(
          pieceData.piece,
          "color",
          !pieceData.piece.masks.isExpanded
            ? layoutData.chapterSelectColor
            : (pieceData.highlightColor ?? pieceData.piece.tags.initialColor)
        );

      if (
        Array.isArray(pieceData.piece.vars.chunksOfVerses) &&
        pieceData.piece.vars.chunksOfVerses.length > 0
      ) {
        pieceData.piece.vars.chunksOfVerses.forEach((chunk) => {
          if (chunk.masks.isSelected) {
            if (
              Array.isArray(chunk.vars.verses) &&
              chunk.vars.verses.length > 0
            ) {
              chunk.vars.verses.forEach((verse) => {
                const verseHighlightInfo = pieceData.getHighlightInfoByKey(
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
            const chunkHighlightInfo = pieceData.getHighlightInfoByKey(
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
