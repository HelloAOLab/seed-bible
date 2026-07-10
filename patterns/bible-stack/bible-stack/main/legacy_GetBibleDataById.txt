/**
 * Retrieves Bible data by its ID from the thisBot list of bibles data.
 *
 * @param {Object} that - The context object containing the Bible ID.
 * @param {number} that.stackBibleId - The ID of the Bible data to retrieve.
 * @returns {Object|undefined} - The Bible data object if found, or `undefined` if not found.
 * @example
 * const bibleData = thisBot.GetBibleDataById({stackBibleId: 1});
 */

const { stackBibleId } = that;
return thisBot.vars.stackBiblesData.find((bibleData) => {
  return bibleData.id === stackBibleId;
});
