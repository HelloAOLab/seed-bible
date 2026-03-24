import { DespawnLabelForPiece } from "bibleVizUtils.controllers.label.lifecycle";
import { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

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
      await DeleteBible(pieceData);
      break;
    case pieceData instanceof StackTestamentData:
      await DeleteTestament(pieceData);
      break;
    case pieceData instanceof StackSectionData:
      await DeleteSection(pieceData);
      break;
    case pieceData instanceof StackSectionBookData:
    case pieceData instanceof StackBookData:
      await DeleteBook(pieceData);
      break;
    case pieceData instanceof StackChapterData:
      await DeleteChapter(pieceData);
      break;
    default:
      break;
  }
} else
  console.warn(
    "interactiveBible.managers.thisBot.DeletePiece. No piece data found."
  );

async function ClearPiece(piece: Bot) {
  const { unhighlightDelayInfo, unhighlightDelayInfoIndex } =
    await thisBot.GetUnhighlightDelayInfo({ piece });
  if (unhighlightDelayInfo) {
    await thisBot.ClearUnhighlightDelay({
      unhighlightDelayInfo,
      unhighlightDelayInfoIndex,
    });
  }

  const isHighlightes = await thisBot.IsBiblePieceHighlighted({ piece });

  if (isHighlightes) {
    await thisBot.RemovePieceFromHighlightedList({ piece });
  }

  DespawnLabelForPiece(piece);

  ObjectPooler.ReleaseObject({
    obj: piece,
    tag: piece.tags.poolTag,
    dimension: thisBot.tags.desiredDimension,
  });
}

async function DeleteChapter(chapterData: StackChapterData) {
  /**
   * Deletes a `StackChapterData` object and its associated verses.
   *
   * @param {StackChapterData} chapterData - The StackChapterData object to delete.
   */

  const chapterDataIndex = thisBot.vars.stackChaptersData.indexOf(chapterData);
  const piece = chapterData.clearPiece();
  if (piece) {
    if (piece.masks.isOnTheGround) {
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
            chunk.vars.verses = [];
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
    await ClearPiece(piece);
  }
  if (chapterDataIndex != null)
    thisBot.vars.stackChaptersData.splice(chapterDataIndex, 1);
}

async function DeleteBook(bookData: StackSectionBookData | StackBookData) {
  /**
   * Deletes a `StackBookData` or `StackSectionBookData` object and its associated chapters.
   *
   * @param {StackBookData|StackSectionBookData} bookData - The StackBookData object to delete.
   */

  let bookDataIndex;
  const children = bookData.clearChildren();
  const piece = bookData.clearPiece();
  const promises: Promise<void>[] = [];

  promises.push(
    ...children.map((child) => {
      return DeleteChapter(child);
    })
  );

  if (piece) {
    promises.push(ClearPiece(piece));
  }

  await Promise.all(promises);

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

async function DeleteSection(sectionData: StackSectionData) {
  /**
   * Deletes a `StackSectionData` object and its associated books.
   *
   * @param {StackSectionData} sectionData - The StackSectionData object to delete.
   */

  const sectionDataIndex = thisBot.vars.stackSectionsData.indexOf(sectionData);

  const children = sectionData.clearChildren();
  const piece = sectionData.clearPiece();
  const shadow = sectionData.detachShadow();
  const promises: Promise<void>[] = [];

  promises.push(
    ...children.flat().map((child) => {
      return DeleteBook(child);
    })
  );

  if (piece) {
    promises.push(ClearPiece(piece));
  }

  if (shadow) {
    promises.push(ClearPiece(shadow));
  }

  await Promise.all(promises);

  if (sectionDataIndex != null)
    thisBot.vars.stackSectionsData.splice(sectionDataIndex, 1);
  if (
    thisBot.vars.lastInteractedStackSectionData &&
    thisBot.vars.lastInteractedStackSectionData == sectionData
  )
    thisBot.vars.lastInteractedStackSectionData = null;
}

async function DeleteTestament(testamentData: StackTestamentData) {
  /**
   * Deletes a `StackTestamentData` object and its associated sections and books.
   *
   * @param {StackTestamentData} testamentData - The StackTestamentData object to delete.
   */

  const testamentDataIndex =
    thisBot.vars.stackTestamentsData.indexOf(testamentData);

  const children = testamentData.clearChildren();
  const piece = testamentData.clearPiece();
  const promises: Promise<void>[] = [];

  promises.push(
    ...children.map((child) => {
      if (child instanceof StackSectionData) return DeleteSection(child);
      else return DeleteBook(child);
    })
  );

  if (piece) {
    promises.push(ClearPiece(piece));
  }

  await Promise.all(promises);

  if (testamentDataIndex != null)
    thisBot.vars.stackTestamentsData.splice(testamentDataIndex, 1);
  if (
    thisBot.vars.lastInteractedStackTestamentData &&
    thisBot.vars.lastInteractedStackTestamentData == testamentData
  )
    thisBot.vars.lastInteractedStackTestamentData = null;
}

async function DeleteBible(bibleData: StackBibleData) {
  /**
   * Deletes a `StackBibleData` object and its associated testaments, sections, and static pieces.
   *
   * @param {StackBibleData} bibleData - The StackBibleData object to delete.
   */

  const bibleDataIndex = thisBot.vars.stackBiblesData.indexOf(bibleData);
  if (bibleData.staticBiblePieces) {
    const clearedPieces = bibleData.clearStaticBiblePieces();
    if (clearedPieces) {
      for (const staticPiece of clearedPieces) {
        await ObjectPooler.ReleaseObject({
          obj: staticPiece,
          tag: staticPiece.tags.poolTag,
          dimension: thisBot.tags.desiredDimension,
        });
      }
    }
  }
  const children = bibleData.clearChildren();
  await Promise.all(children.map((child) => DeleteTestament(child)));

  if (bibleDataIndex != null)
    thisBot.vars.stackBiblesData.splice(bibleDataIndex, 1);
  if (
    thisBot.vars.lastInteractedStackBibleData &&
    thisBot.vars.lastInteractedStackBibleData == bibleData
  )
    thisBot.vars.lastInteractedStackBibleData = null;
}
