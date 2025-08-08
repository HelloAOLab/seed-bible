/**
    * Retrieves Bible data by its ID from the StacksManager list of bibles data.
    *
    * @param {Object} that - The context object containing the Bible ID.
    * @param {number} that.bibleId - The ID of the Bible data to retrieve.
    * @returns {Object|undefined} - The Bible data object if found, or `undefined` if not found.
    * @example
    * const bibleData = StacksManager.GetBibleDataById({bibleId: 1});
*/

const {bibleId} = that;
return thisBot.vars.biblesData.find((bibleData) => {return bibleData.id === bibleId});