/**
 * Retrieves the last interacted StackBookData stored in the thisBot vars.
 *
 * @returns {string} - The last interacted StackBookData.
 * @example
 * const arrangementName = thisBot.GetLastInteractedBookData();
 */

import { StackBookData } from "bibleVizUtils.models.entities.StackBookData";

return thisBot.vars.lastInteractedStackBookData as StackBookData;
