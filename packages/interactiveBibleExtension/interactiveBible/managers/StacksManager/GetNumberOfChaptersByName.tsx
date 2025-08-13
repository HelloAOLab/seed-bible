/**
    * Retrieves the number of chapters for a book based on its common name.
    *
    * @param {Object} that - The context object containing the book's name.
    * @param {string} that.name - The common name of the book to find.
    * @returns {number|undefined} - The number of chapters in the book if found, or `undefined` if the book is not found.
    * @example
    * const numberOfChapters = StacksManager.GetNumberOfChaptersByName({name: "Genesis"});
*/

const {name} = that;
let numberOfChapters;
const {arrangementIndex, testamentIndex, sectionIndex, found} = thisBot.GetBookInfoPathByName({name});
const bookInfo = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex].books.find((currentBookInfo) => {return currentBookInfo.commonName == name});
if(bookInfo) numberOfChapters = bookInfo.numberOfChapters
return numberOfChapters;