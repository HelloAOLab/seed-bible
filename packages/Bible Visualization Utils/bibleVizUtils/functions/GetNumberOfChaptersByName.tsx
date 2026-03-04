/**
 * Retrieves the number of chapters for a book based on its common name.
 *
 * @param {Object} that - The context object containing the book's name.
 * @param {string} that.name - The common name of the book to find.
 * @returns {number|undefined} - The number of chapters in the book if found, or `undefined` if the book is not found.
 * @example
 * const numberOfChapters = BibleVizUtils.Functions.GetNumberOfChaptersByName({name: "Genesis"});
 */

const { name } = that;
return BibleVizUtils.Data.tags.booksStaticInfo[name].numberOfChapters;
