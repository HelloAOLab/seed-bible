import { arrangementService } from "bibleVizUtils.services.index";

/**
 * Spawns a section, selects it, and then ejects a specific book from the section.
 *
 * @param {Object} that - Object containing the section and book information.
 * @param {string} that.sectionName - The name of the section to spawn.
 * @param {number} that.bookName - The name of the book to eject.
 *
 * @returns {Promise<void>} - A promise that resolves when the section is spawned, selected, and the book is ejected.
 *
 * @example
 * thisBot.SpawnSectionAndPickBook({ sectionName: "Law", bookName: "Genesis" });
 */

const { sectionName, bookName } = that;
const { arrangementIndex, testamentIndex, sectionIndex, found } =
  arrangementService.getSectionInfoPathByName(sectionName);

if (!found) {
  console.error(`section info path not found at SpawnSectionAndPickBook`);
}

const section = arrangementService.getSectionByIndices({
  arrangementIndex,
  testamentIndex: testamentIndex as number,
  sectionIndex: sectionIndex as number,
});

if (!section) {
  console.error(`section not found at SpawnSectionAndPickBook`);
  return;
}

if (section.books.length > 1) {
  const { sectionData } = await thisBot.SpawnSection({ name: sectionName });
  await thisBot.SelectSection({ section: sectionData.piece });
  await thisBot.PickBook({ sectionData: sectionData, bookName });
}
