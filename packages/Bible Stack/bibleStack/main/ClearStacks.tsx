/**
 * Delete every stack in the canvas and clears every temp data on the stacks manager.
 * @example
 * shout('ClearStacks')
 */

clearAnimations(thisBot);

for (const bibleData of thisBot.vars.stackBiblesData.slice()) {
  await thisBot.DeletePiece({ pieceData: bibleData });
}
for (const testamentData of thisBot.vars.stackTestamentsData.slice()) {
  await thisBot.DeletePiece({ pieceData: testamentData });
}
for (const sectionData of thisBot.vars.stackSectionsData.slice()) {
  await thisBot.DeletePiece({ pieceData: sectionData });
}
for (const sectionBookData of thisBot.vars.stackSectionBooksData.slice()) {
  await thisBot.DeletePiece({ pieceData: sectionBookData });
}
for (const bookData of thisBot.vars.stackBooksData.slice()) {
  await thisBot.DeletePiece({ pieceData: bookData });
}
for (const chapterData of thisBot.vars.stackChaptersData.slice()) {
  await thisBot.DeletePiece({ pieceData: chapterData });
}
thisBot.vars.unhighlightDelaysInfo.forEach((unhighlightDelayInfo) => {
  clearTimeout(unhighlightDelayInfo.timeoutId);
});

thisBot.vars.lastInteractedStackBookData = null;
thisBot.vars.lastInteractedStackSectionData = null;
thisBot.vars.lastInteractedStackTestamentData = null;
thisBot.vars.lastInteractedStackBibleData = null;
thisBot.vars.highlightedPieces = [];
thisBot.vars.unhighlightDelaysInfo = [];

clearTagMasks(thisBot);

setTagMask(
  thisBot,
  "areBiblePiecesDraggable",
  thisBot.tags.areBiblePiecesDraggable
);
