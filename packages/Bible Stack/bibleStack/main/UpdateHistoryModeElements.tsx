const piecesData = [
  ...thisBot.vars.stackTestamentsData,
  ...thisBot.vars.stackSectionsData,
  ...thisBot.vars.stackSectionBooksData,
  ...thisBot.vars.stackBooksData,
  ...thisBot.vars.stackChaptersData,
];
piecesData.forEach((pieceData: any) => {
  const isPieceAvailable =
    pieceData.piece &&
    (pieceData instanceof StackTestamentData
      ? !pieceData.isSplitIntoSections
      : pieceData instanceof StackSectionData
        ? !pieceData.isSplitIntoBooks
        : pieceData instanceof StackSectionBookData ||
            pieceData instanceof StackBookData
          ? !pieceData.isSelected
          : true);
  if (isPieceAvailable) {
    const color = BibleVizUtils.Functions.GetHistoryColor({
      piece: pieceData.piece,
    });
    setTagMask(pieceData.piece, "color", color);
    if (color != BibleVizUtils.Data.tags.historyNullColor) {
      if (pieceData instanceof StackChapterData) {
        if (
          pieceData.isSelected &&
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
