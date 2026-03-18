import { DespawnLabelForPiece } from "bibleVizUtils.controllers.label.lifecycle";
import { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";

/**
 * Deletes a Bible, Testament, Section, Book, or Chapter based on the provided `pieceData`.
 * It removes the piece from the data structures and releases associated resources.
 *
 * @param {Object} that - Context containing the piece and its data.
 * @param {Object} that.pieceData - Data object representing the piece to delete.
 * @param {Object} that.piece - Piece associated with the data.
 *
 * @returns {void}
 * @throws {Error} - If no piece data is found or deletion fails.
 *
 * @example
 * thisBot.DeletePiece({pieceData: somePieceData, piece: somePiece});
 */

let { pieceData } = that;
const { piece } = that;
if (!pieceData) {
  if (piece.tags.isStackPiece) {
    pieceData = thisBot.GetPieceData({ piece });
  } else if (piece.tags.isStackBibleTransformer) {
    pieceData = thisBot.vars.stackBiblesData.find((bibleData) => {
      return bibleData.id == piece.tags.stackBibleId;
    });
  } else if (piece.tags.isSectionShadow) {
    pieceData = thisBot.vars.stackSectionsData.find((data) => {
      return data.isActive && data.id == piece.tags.sectionDataId;
    });
  }
}
// const {bibleData, testamentData, sectionData, sectionBookData, bookData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: pieceData.parentDataIds});
if (pieceData) {
  switch (true) {
    case pieceData instanceof StackBibleData:
      DeleteBible(pieceData);
      break;
    case pieceData instanceof StackTestamentData:
      DeleteTestament(pieceData);
      break;
    case pieceData instanceof StackSectionData:
      DeleteSection(pieceData);
      break;
    case pieceData instanceof StackSectionBookData:
    case pieceData instanceof StackBookData:
      DeleteBook(pieceData);
      break;
    case pieceData instanceof StackChapterData:
      DeleteChapter(pieceData);
      break;
    default:
      break;
  }
} else
  console.warn(
    "interactiveBible.managers.thisBot.DeletePiece. No piece data found."
  );

// TODO: Fix DRY

function DeleteChapter(chapterData: StackChapterData) {
  /**
   * Deletes a `StackChapterData` object and its associated verses.
   *
   * @param {StackChapterData} chapterData - The StackChapterData object to delete.
   */

  const chapterDataIndex = thisBot.vars.stackChaptersData.indexOf(chapterData);
  const piece = chapterData.clearPiece();
  if (piece) {
    if (piece.masks.isOnTheGround) {
      DespawnLabelForPiece(piece);
      if (chapterData.isSelected && piece.vars.chunksOfVerses?.length > 0) {
        piece.vars.chunksOfVerses.forEach((chunk) => {
          if (chunk.masks.isSelected && chunk.vars.verses?.length > 0) {
            chunk.vars.verses.flat().forEach((verse) => {
              ObjectPooler.ReleaseObject({
                obj: verse,
                tag: verse.tags.poolTag,
                dimension: thisBot.tags.desiredDimension,
              });
            });
            chunk.vars.verses = []; //.splice(0, chunk.vars.verses.length);
          }
          ObjectPooler.ReleaseObject({
            obj: chunk,
            tag: chunk.tags.poolTag,
            dimension: thisBot.tags.desiredDimension,
          });
        });
        piece.vars.chunksOfVerses = []; //.splice(0, chapterData.piece.vars.chunksOfVerses.length);
      }
    }
    ObjectPooler.ReleaseObject({
      obj: piece,
      tag: piece.tags.poolTag,
      dimension: thisBot.tags.desiredDimension,
    });
  }
  // chapterData.pieceInfo = null;
  // chapterData.parentDataIds = null;
  if (chapterDataIndex != null)
    thisBot.vars.stackChaptersData.splice(chapterDataIndex, 1);
}

function DeleteBook(bookData: StackSectionBookData | StackBookData) {
  /**
   * Deletes a `StackBookData` or `StackSectionBookData` object and its associated chapters.
   *
   * @param {StackBookData|StackSectionBookData} bookData - The StackBookData object to delete.
   */

  let bookDataIndex;
  const children = bookData.clearChildren();
  children.forEach((chapterData) => {
    DeleteChapter(chapterData);
  });
  const piece = bookData.clearPiece();
  if (piece) {
    const { unhighlightDelayInfo, unhighlightDelayInfoIndex } =
      thisBot.GetUnhighlightDelayInfo({ piece });
    if (unhighlightDelayInfo)
      thisBot.ClearUnhighlightDelay({
        unhighlightDelayInfo,
        unhighlightDelayInfoIndex,
      });
    if (thisBot.IsBiblePieceHighlighted({ piece }))
      thisBot.RemovePieceFromHighlightedList({ piece });
    DespawnLabelForPiece(piece);
    ObjectPooler.ReleaseObject({
      obj: piece,
      tag: piece.tags.poolTag,
      dimension: thisBot.tags.desiredDimension,
    });
  }

  // bookData.pieceInfo = null;
  // bookData.parentDataIds = null;
  // bookData.creationParams = null;

  if (bookData instanceof StackBookData) {
    bookDataIndex = thisBot.vars.stackBooksData.indexOf(bookData);
    if (bookDataIndex != null)
      thisBot.vars.stackBooksData.splice(bookDataIndex, 1);
  } else {
    // bookData.pieceBookInfo = null;
    bookDataIndex = thisBot.vars.stackSectionBooksData.indexOf(bookData);
    if (bookDataIndex != null)
      thisBot.vars.stackSectionBooksData.splice(bookDataIndex, 1);
  }
  if (
    thisBot.vars.lastInteractedStackBookData &&
    thisBot.vars.lastInteractedStackBookData == bookData
  )
    thisBot.vars.lastInteractedStackBookData = null;
}

function DeleteSection(sectionData: StackSectionData) {
  /**
   * Deletes a `StackSectionData` object and its associated books.
   *
   * @param {StackSectionData} sectionData - The StackSectionData object to delete.
   */

  const sectionDataIndex = thisBot.vars.stackSectionsData.indexOf(sectionData);
  const children = sectionData.clearChildren();
  children.flat().forEach((bookData) => {
    DeleteBook(bookData);
  });
  const piece = sectionData.clearPiece();
  if (piece) {
    const { unhighlightDelayInfo, unhighlightDelayInfoIndex } =
      thisBot.GetUnhighlightDelayInfo({ piece });
    if (unhighlightDelayInfo)
      thisBot.ClearUnhighlightDelay({
        unhighlightDelayInfo,
        unhighlightDelayInfoIndex,
      });
    if (thisBot.IsBiblePieceHighlighted({ piece }))
      thisBot.RemovePieceFromHighlightedList({ piece });
    DespawnLabelForPiece(piece);
    ObjectPooler.ReleaseObject({
      obj: piece,
      tag: piece.tags.poolTag,
      dimension: thisBot.tags.desiredDimension,
    });
  }
  const shadow = sectionData.detachShadow();
  if (shadow) {
    DespawnLabelForPiece(shadow);
    ObjectPooler.ReleaseObject({
      obj: shadow,
      tag: shadow.tags.poolTag,
      dimension: thisBot.tags.desiredDimension,
    });
  }

  // sectionData.pieceInfo = null;
  // sectionData.parentDataIds = null;
  // sectionData.creationParams = null;

  if (sectionDataIndex != null)
    thisBot.vars.stackSectionsData.splice(sectionDataIndex, 1);
  if (
    thisBot.vars.lastInteractedStackSectionData &&
    thisBot.vars.lastInteractedStackSectionData == sectionData
  )
    thisBot.vars.lastInteractedStackSectionData = null;
}

function DeleteTestament(testamentData: StackTestamentData) {
  /**
   * Deletes a `StackTestamentData` object and its associated sections and books.
   *
   * @param {StackTestamentData} testamentData - The StackTestamentData object to delete.
   */

  const testamentDataIndex =
    thisBot.vars.stackTestamentsData.indexOf(testamentData);
  const children = testamentData.clearChildren();
  children.forEach((data) => {
    if (data instanceof StackSectionData) DeleteSection(data);
    else if (data instanceof StackSectionBookData) DeleteBook(data);
    else {
      console.error(`Unsupported child type`, { child: data });
      return;
    }
  });

  const piece = testamentData.clearPiece();
  if (piece) {
    const { unhighlightDelayInfo, unhighlightDelayInfoIndex } =
      thisBot.GetUnhighlightDelayInfo({ piece });
    if (unhighlightDelayInfo)
      thisBot.ClearUnhighlightDelay({
        unhighlightDelayInfo,
        unhighlightDelayInfoIndex,
      });
    if (thisBot.IsBiblePieceHighlighted({ piece }))
      thisBot.RemovePieceFromHighlightedList({ piece });
    DespawnLabelForPiece(piece);
    ObjectPooler.ReleaseObject({
      obj: piece,
      tag: piece.tags.poolTag,
      dimension: thisBot.tags.desiredDimension,
    });
  }

  // testamentData.pieceInfo = null;
  // testamentData.parentDataIds = null;
  // testamentData.creationParams = null;

  if (testamentDataIndex != null)
    thisBot.vars.stackTestamentsData.splice(testamentDataIndex, 1);
  if (
    thisBot.vars.lastInteractedStackTestamentData &&
    thisBot.vars.lastInteractedStackTestamentData == testamentData
  )
    thisBot.vars.lastInteractedStackTestamentData = null;
}

function DeleteBible(bibleData: StackBibleData) {
  /**
   * Deletes a `StackBibleData` object and its associated testaments, sections, and static pieces.
   *
   * @param {StackBibleData} bibleData - The StackBibleData object to delete.
   */

  // shout('OnBibleDeleted');
  // if (globalThis?.SetCanvasTools) {
  //     SetCanvasTools(tools => {
  //         return tools.map(tool => {
  //             if (tool.label === "Bible stack") {
  //                 return {
  //                     ...tool,
  //                     active: true
  //                 }
  //             } else {
  //                 return tool
  //             }
  //         })
  //     })
  // }
  const bibleDataIndex = thisBot.vars.stackBiblesData.indexOf(bibleData);
  if (bibleData.staticBiblePieces) {
    const clearedPieces = bibleData.clearStaticBiblePieces();
    if (clearedPieces) {
      for (const staticPiece of clearedPieces) {
        ObjectPooler.ReleaseObject({
          obj: staticPiece,
          tag: staticPiece.tags.poolTag,
          dimension: thisBot.tags.desiredDimension,
        });
      }
    }
  }
  const clearedTestaments = bibleData.clearChildren();
  clearedTestaments.forEach((testamentData) => {
    DeleteTestament(testamentData);
  });
  if (bibleDataIndex != null)
    thisBot.vars.stackBiblesData.splice(bibleDataIndex, 1);
  if (
    thisBot.vars.lastInteractedStackBibleData &&
    thisBot.vars.lastInteractedStackBibleData == bibleData
  )
    thisBot.vars.lastInteractedStackBibleData = null;
}
