import type { UnhighlightDelayInfo } from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

type UnhighlightDelaysInfo = Map<Bot["id"], UnhighlightDelayInfo>;

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
(thisBot.vars.unhighlightDelaysInfo as UnhighlightDelaysInfo).forEach(
  (unhighlightDelayInfo) => {
    clearTimeout(unhighlightDelayInfo.timeoutId);
  }
);

clearTagMasks(thisBot);
thisBot.Initialize();
