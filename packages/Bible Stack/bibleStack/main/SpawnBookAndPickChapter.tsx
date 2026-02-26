import { scriptureService } from "bibleVizUtils.services.index";

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
const { arrangementIndex, testamentIndex, sectionIndex } =
  scriptureService.getBookInfoPathByName({ name: bookName });
const sectionName =
  BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex].testaments[
    testamentIndex
  ].sections[sectionIndex].name;
let bookData;
if (
  BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex].testaments[
    testamentIndex
  ].sections[sectionIndex].books.length > 1
) {
  ({ bookData } = await thisBot.SpawnBook({ name: bookName }));
} else {
  ({ sectionData: bookData } = await thisBot.SpawnSection({
    name: sectionName,
  }));
}
await thisBot.SelectBook({ book: bookData.piece, setBibleAnimating: false });
await thisBot.PickChapter({ bookData, chapterNumber });
