/**
 * Searches for the path of a testament based on its name, returning the arrangement and testament indices.
 *
 * @param {Object} that - The context object containing the testament's name.
 * @param {string} that.name - The name of the testament to find.
 * @returns {Object} - An object containing the indices of the arrangement and testament where the testament was found, and a boolean indicating whether it was found.
 * @returns {number} returns.arrangementIndex - The index of the arrangement containing the testament.
 * @returns {number} returns.testamentIndex - The index of the testament.
 * @returns {boolean} returns.found - Whether the testament was found.
 * @example
 * const {arrangementIndex, testamentIndex, found} = thisBot.GetTestamentInfoPathByName({name: "New Testament"});
 */

const { name } = that;
const arrangementIndex = BibleVizUtils.Functions.GetCurrentArrangementIndex();
let testamentIndex;
let found = false;
for (const currentTestamentIndex in BibleVizUtils.Data.vars
  .fixedArrangementsInfo[arrangementIndex].testaments) {
  const testamentInfo =
    BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex].testaments[
      currentTestamentIndex
    ];
  if (testamentInfo.name === name) {
    testamentIndex = currentTestamentIndex;
    found = true;
    break;
  }
}
return { arrangementIndex, testamentIndex, found };
