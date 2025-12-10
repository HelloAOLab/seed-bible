/**
 * Sets the current arrangement index of the BibleStackManager by the name of the arrangement.
 *
 * This function searches for an arrangement by its name in this bot's `arrangementsInfo` and updates the
 * bot's `arrangementIndex` to match the index of the found arrangement. If no arrangement with the given
 * name is found, the index is not changed.
 *
 * @param {Object} that - Contains the name of the arrangement to be found.
 * @param {string} that.name - The name of the arrangement to search for.
 *
 * @example
 * BibleStackManager.SetArrangementIndexByName({ name: "traditional" });
 */

const { name } = that;
const arrangement = BibleVizUtils.Data.vars.fixedArrangementsInfo.find(
  (currentArrangement) => {
    return currentArrangement.name == name;
  }
);
if (arrangement) {
  const index =
    BibleVizUtils.Data.vars.fixedArrangementsInfo.indexOf(arrangement);
  BibleVizUtils.Data.vars.arrangementIndex = index;
}
