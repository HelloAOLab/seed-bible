/**
    * Searches for the path of a book in the Bible based on its common name, returning the arrangement, testament, and section where it is found.
    *
    * @param {Object} that - The context object containing the book's name.
    * @param {string} that.name - The common name of the book to find.
    * @returns {Object} - An object containing the indices of the arrangement, testament, and section where the book was found, and a boolean indicating whether it was found.
    * @returns {number} returns.arrangementIndex - The index of the arrangement containing the book.
    * @returns {number} returns.testamentIndex - The index of the testament containing the book.
    * @returns {string} returns.sectionIndex - The index of the section containing the book.
    * @returns {boolean} returns.found - Whether the book was found.
    * @example
    * const {arrangementIndex, testamentIndex, sectionIndex, found} = thisBot.GetBookInfoPathByName({name: "Genesis"});
*/

const {name, arrangementIndex = BibleVizUtils.Functions.GetCurrentArrangementIndex()} = that;
const initialArrangementIndex = arrangementIndex;
let testamentIndex, sectionIndex;
let found = false;
let bookIndex;

for(const currentTestamentIndex in BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex].testaments)
{
    const testamentInfo = BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex].testaments[currentTestamentIndex];
    for(const currentSectionIndex in testamentInfo.sections)
    {
        const sectionInfo = testamentInfo.sections[currentSectionIndex];
        const bookInfo = sectionInfo.books.find((bookInfo) => {return bookInfo.commonName == name})
        if(bookInfo)
        {
            testamentIndex = currentTestamentIndex;
            sectionIndex = currentSectionIndex;
            bookIndex = sectionInfo.books.indexOf(bookInfo)
            found = true;
            break;
        }
    }
}
if(!found)
{
    for(const currentArrangementIndex in BibleVizUtils.Data.vars.fixedArrangementsInfo)
    {
        if(currentArrangementIndex == initialArrangementIndex) continue;
        for(const currentTestamentIndex in BibleVizUtils.Data.vars.fixedArrangementsInfo[currentArrangementIndex].testaments)
        {
            const testamentInfo = BibleVizUtils.Data.vars.fixedArrangementsInfo[currentArrangementIndex].testaments[currentTestamentIndex];
            for(const currentSectionIndex in testamentInfo.sections)
            {
                const sectionInfo = testamentInfo.sections[currentSectionIndex];
                const bookInfo = sectionInfo.books.find((bookInfo) => {return bookInfo.commonName == name})
                if(bookInfo)
                {
                    arrangementIndex = currentArrangementIndex;
                    testamentIndex = currentTestamentIndex;
                    sectionIndex = currentSectionIndex;
                    bookIndex = sectionInfo.books.indexOf(bookInfo)
                    found = true;
                    break;
                }
            }
        }
    }
}
return {arrangementIndex, testamentIndex, sectionIndex, bookIndex, found};