/**
    * Take an instance of ParentDataIds and return the chain of parents data
    * @param {Object} that - Object that contains important data for the function
    * @param {ParentDataIds} that.parentDataIds - Object that contains the ids of the data of the parents of some element
    * @example
    * const {bibleData, testamentData, sectionData, sectionBookData, bookData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds});
*/

const {parentDataIds} = that;
let bibleData, testamentData, sectionData, sectionBookData, bookData;

if(parentDataIds.bibleId) bibleData = thisBot.vars.biblesData.find((data) => {return data.id === parentDataIds.bibleId})
if(parentDataIds.testamentId) testamentData = thisBot.vars.testamentsData.find((data) => {return data.id === parentDataIds.testamentId})
if(parentDataIds.sectionId) sectionData = thisBot.vars.sectionsData.find((data) => {return data.id === parentDataIds.sectionId})
if(parentDataIds.sectionBookId) sectionBookData = thisBot.vars.sectionBooksData.find((data) => {return data.id === parentDataIds.sectionBookId})
if(parentDataIds.bookId) bookData = thisBot.vars.booksData.find((data) => {return data.id === parentDataIds.bookId})

return {bibleData, testamentData, sectionData, sectionBookData, bookData};