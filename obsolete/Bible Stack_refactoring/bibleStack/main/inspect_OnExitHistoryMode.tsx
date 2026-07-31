import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

const piecesData = [
  ...(thisBot.vars.stackTestamentsData as StackTestamentData[]),
  ...(thisBot.vars.stackSectionsData as StackSectionData[]),
  ...(thisBot.vars.stackSectionBooksData as StackSectionBookData[]),
  ...(thisBot.vars.stackBooksData as StackBookData[]),
  ...(thisBot.vars.stackChaptersData as StackChapterData[]),
];

piecesData.forEach((pieceData) => {
  if (pieceData.isPieceAvailable()) {
    const piece = pieceData.piece as Bot;
    if (pieceData instanceof StackChapterData && pieceData.isSelected) {
      if (piece.masks.isOnTheGround)
        setTagMask(
          piece,
          "color",
          pieceData.highlightColor ?? piece.tags.initialColor
        );
      else
        setTagMask(
          piece,
          "color",
          pieceData.highlightColor ?? piece.tags.selectedColor
        );
      if (
        Array.isArray(piece.vars.chunksOfVerses) &&
        piece.vars.chunksOfVerses.length > 0
      ) {
        piece.vars.chunksOfVerses.forEach((chunk) => {
          if (chunk.masks.isSelected) {
            if (
              Array.isArray(chunk.vars.verses) &&
              chunk.vars.verses.length > 0
            ) {
              chunk.vars.verses.forEach((verse) => {
                const chapterData = thisBot.GetChapterDataById({
                  id: verse.masks.chapterDataId,
                });
                const verseHighlightInfo = chapterData.HighlightsInfo.find(
                  (currHighlightInfo) => {
                    return currHighlightInfo.key == verse.masks.versePath;
                  }
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
            const chapterData = thisBot.GetChapterDataById({
              id: chunk.masks.chapterDataId,
            });
            const chunkHighlightInfo = chapterData.HighlightsInfo.find(
              (currHighlightInfo) => {
                return currHighlightInfo.key == chunk.masks.chunkPath;
              }
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
        piece,
        "color",
        pieceData.highlightColor ?? piece.tags.initialColor
      );
    }
  }
});
