/**
 * Take an instance of ParentDataIds and return the chain of parents data
 * @param {Object} that - Object that contains important data for the function
 * @param {ParentDataIds} that.parentDataIds - Object that contains the ids of the data of the parents of some piece
 * @example
 * const {bibleData, testamentData, sectionData, sectionBookData, bookData} = thisBot.GetDataChainFromParentDataIds({parentDataIds});
 */

const { parentDataIds } = that;
let bibleData, testamentData, sectionData, sectionBookData, bookData;

if (parentDataIds.stackBibleId)
  bibleData = thisBot.vars.stackBiblesData.find((data) => {
    return data.id === parentDataIds.stackBibleId;
  });
if (parentDataIds.stackTestamentId)
  testamentData = thisBot.vars.stackTestamentsData.find((data) => {
    return data.id === parentDataIds.stackTestamentId;
  });
if (parentDataIds.stackSectionId)
  sectionData = thisBot.vars.stackSectionsData.find((data) => {
    return data.id === parentDataIds.stackSectionId;
  });
if (parentDataIds.stackSectionBookId)
  sectionBookData = thisBot.vars.stackSectionBooksData.find((data) => {
    return data.id === parentDataIds.stackSectionBookId;
  });
if (parentDataIds.stackBookId)
  bookData = thisBot.vars.stackBooksData.find((data) => {
    return data.id === parentDataIds.stackBookId;
  });

return { bibleData, testamentData, sectionData, sectionBookData, bookData };
