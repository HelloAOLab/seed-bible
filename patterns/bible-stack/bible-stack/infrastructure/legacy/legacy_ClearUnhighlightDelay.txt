/**
 * Clears the specified unhighlight delay.
 * @param {Object} that - Object that contains important data for the function
 * @param {UnhighlightDelayInfo} that.unhighlightDelayInfo - The object containing the info of the unhighlight delay
 * @example
 * thisBot.ClearUnhighlightDelay({unhighlightDelayInfo: someUnhighlightDelayInfo});
 */

import type { UnhighlightDelayInfo } from "bibleVizUtils.infrastructure.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

const {
  unhighlightDelayInfo,
}: {
  unhighlightDelayInfo: UnhighlightDelayInfo;
} = that;

type UnhighlightDelaysInfo = Map<Bot["id"], UnhighlightDelayInfo>;

clearTimeout(unhighlightDelayInfo.timeoutId);
(thisBot.vars.unhighlightDelaysInfo as UnhighlightDelaysInfo).delete(
  unhighlightDelayInfo.piece.id
);
