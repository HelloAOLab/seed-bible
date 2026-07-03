/**
 * Retrieves the unhighlight delay information for a given piece, including its index in the delay info array.
 *
 * @param {Object} that - The context object containing the piece.
 * @param {Object} that.piece - The piece for which to retrieve unhighlight delay information.
 * @returns {Object} - An object containing the unhighlight delay information and its index.
 * @returns {Object} returns.unhighlightDelayInfo - The unhighlight delay information for the piece, or `undefined` if not found.
 * @example
 * const {unhighlightDelayInfo} = thisBot.GetUnhighlightDelayInfo({piece: somePiece});
 */

import type { UnhighlightDelayInfo } from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

const {
  piece,
}: {
  piece: Bot;
} = that;

type UnhighlightDelaysInfo = Map<Bot["id"], UnhighlightDelayInfo>;

const unhighlightDelayInfo = (
  thisBot.vars.unhighlightDelaysInfo as UnhighlightDelaysInfo
).get(piece.id);

return { unhighlightDelayInfo };
