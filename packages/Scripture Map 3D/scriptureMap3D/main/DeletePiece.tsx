import { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";
import { LayoutBookData } from "bibleVizUtils.models.entities.LayoutBookData";
import { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

let {
  pieceData,
}: {
  pieceData: LayoutBibleData | LayoutBookData | LayoutChapterData;
} = that;
const {
  piece,
}: {
  piece: Bot | undefined;
} = that;

if (!pieceData || !piece) {
  console.error("A pieceData or a piece must be provided at DeletePiece");
  return;
}

if (!pieceData) {
  if (piece.tags.isLayoutCover) {
    pieceData = thisBot.vars.layoutsData.find((layoutData) => {
      return layoutData.id == piece.tags.layoutId;
    });
  } else if (piece.tags.isLayoutPiece) {
    pieceData = thisBot.GetPieceData({ piece });
  }
}

if (pieceData) {
  switch (true) {
    case pieceData instanceof LayoutBibleData:
      DeleteLayout(pieceData);
      break;
    case pieceData instanceof LayoutBookData:
      DeleteBook(pieceData);
      break;
    case pieceData instanceof LayoutChapterData:
      DeleteChapter(pieceData);
      break;
    default:
      break;
  }
} else console.warn("scriptureMap3D.main.DeletePiece. No piece data found.");

function DeleteChapter(chapterData: LayoutChapterData) {
  const chapterDataIndex = thisBot.vars.layoutChaptersData.indexOf(chapterData);
  if (chapterData.piece) {
    tryHideNotification(chapterData.piece);
    if (
      chapterData.isSelected &&
      Array.isArray(chapterData.piece.vars.chunksOfVerses) &&
      chapterData.piece.vars.chunksOfVerses.length > 0
    ) {
      chapterData.piece.vars.chunksOfVerses.forEach((chunk) => {
        if (
          chunk.masks.isSelected &&
          Array.isArray(chunk.vars.verses) &&
          chunk.vars.verses.length > 0
        ) {
          chunk.vars.verses.flat().forEach((verse) => {
            ObjectPooler.ReleaseObject({ obj: verse, tag: verse.tags.poolTag });
          });
          chunk.vars.verses.splice(0, chunk.vars.verses.length);
        }
        ObjectPooler.ReleaseObject({ obj: chunk, tag: chunk.tags.poolTag });
      });
      chapterData.piece.vars.chunksOfVerses.splice(
        0,
        chapterData.piece.vars.chunksOfVerses.length
      );
    }
    const piece = chapterData.clearPiece();
    ObjectPooler.ReleaseObject({
      obj: piece,
      tag: piece.tags.poolTag,
    });
  }
  // chapterData.pieceInfo = null;
  // chapterData.parentDataIds = null;
  // chapterData.ResetData();
  if (chapterDataIndex >= 0)
    thisBot.vars.layoutChaptersData.splice(chapterDataIndex, 1);
}

function DeleteBook(layoutBookData: LayoutBookData) {
  const bookDataIndex = thisBot.vars.layoutBooksData.indexOf(layoutBookData);
  const clearedChapters = layoutBookData.clearChildren();
  for (const chapterData of clearedChapters) {
    DeleteChapter(chapterData);
  }
  const piece = layoutBookData.clearPiece();
  if (piece) {
    ObjectPooler.ReleaseObject({
      obj: piece,
      tag: piece.tags.poolTag,
    });
  }

  // layoutBookData.pieceInfo = null;
  // layoutBookData.parentDataIds = null;
  // layoutBookData.creationParams = null;

  if (bookDataIndex >= 0) thisBot.vars.layoutBooksData.splice(bookDataIndex, 1);
}

function DeleteLayout(layoutData: LayoutBibleData) {
  const layoutDataIndex = thisBot.vars.layoutsData.indexOf(layoutData);
  const clearedPieces = layoutData.clearStaticPieces();
  if (clearedPieces) {
    for (const staticPiece of clearedPieces) {
      const fixedPiece = Array.isArray(staticPiece)
        ? staticPiece
        : [staticPiece];
      fixedPiece.forEach((currPiece) => {
        ObjectPooler.ReleaseObject({
          obj: currPiece,
          tag: currPiece.tags.poolTag,
        });
      });
    }
  }
  const clearedStructures = layoutData.clearChildren();
  for (const structure of clearedStructures) {
    DeleteBook(structure.layoutBookData);

    ObjectPooler.ReleaseObject({
      obj: structure.nameLabel,
      tag: structure.nameLabel.tags.poolTag,
    });
    ObjectPooler.ReleaseObject({
      obj: structure.dateLabel,
      tag: structure.dateLabel.tags.poolTag,
    });
    const bookStructureIndex =
      thisBot.vars.layoutBooksStructure.indexOf(structure);
    if (bookStructureIndex >= 0)
      thisBot.vars.layoutBooksStructure.splice(bookStructureIndex, 1);
  }
  if (layoutDataIndex >= 0) thisBot.vars.layoutsData.splice(layoutDataIndex, 1);
}
