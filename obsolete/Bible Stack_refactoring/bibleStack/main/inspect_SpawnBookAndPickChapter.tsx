import { arrangementService } from "bibleVizUtils.services.index";

/**
 * Spawns a book, selects it, and then ejects a specific chapter from the book.
 *
 * @param {Object} that - Object containing the book and chapter information.
 * @param {string} that.bookName - The name of the book to spawn.
 * @param {number} that.chapterNumber - The number of the chapter to eject.
 *
 * @returns {Promise<void>} - A promise that resolves when the book is spawned, selected, and the chapter is ejected.
 *
 * @example
 * thisBot.SpawnBookAndPickChapter({ bookName: "Exodus", chapterNumber: 3 });
 */

const { bookName, chapterNumber } = that;
const { arrangementIndex, testamentIndex, sectionIndex, found } =
  arrangementService.getBookInfoPathByName({ name: bookName });

if (!found) {
  console.error(`Book info path not found at SpawnBookAndPickChapter`);
  return;
}

const section = arrangementService.getSectionByIndices({
  arrangementIndex,
  testamentIndex: testamentIndex as number,
  sectionIndex: sectionIndex as number,
});

if (!section) {
  console.error(`Section not found at SpawnBookAndPickChapter`);
  return;
}

let bookData;
if (section.books.length > 1) {
  ({ bookData } = await thisBot.SpawnBook({ name: bookName }));
} else {
  ({ sectionData: bookData } = await thisBot.SpawnSection({
    name: section.name,
  }));
}
await thisBot.SelectBook({ book: bookData.piece, setBibleAnimating: false });
await thisBot.PickChapter({ bookData, chapterNumber });
