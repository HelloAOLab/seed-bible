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
  const isPieceAvailable = pieceData.isPieceAvailable();
  if (isPieceAvailable) {
    const piece = pieceData.piece as Bot;
    const color = BibleVizUtils.Functions.GetHistoryColor({ piece });
    setTagMask(piece, "color", color);
    if (color != BibleVizUtils.Data.tags.historyNullColor) {
      if (pieceData instanceof StackChapterData) {
        if (
          pieceData.isSelected &&
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
      }
    }
  }
});
