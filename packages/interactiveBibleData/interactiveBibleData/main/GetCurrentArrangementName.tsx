/**
    * Retrieves the name of the current arrangement based on the current arrangement index.
    *
    * @returns {string} - The name of the current arrangement.
    * @example
    * const arrangementName = StacksManager.GetCurrentArrangementName();
*/

return thisBot.vars.fixedArrangementsInfo?.[thisBot.GetCurrentArrangementIndex()]?.name;