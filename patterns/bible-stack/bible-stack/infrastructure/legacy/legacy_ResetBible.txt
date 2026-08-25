/**
 * Resets the current state of the Bible and triggers a reset event.
 * This function sets the Bible as animating and triggers the "OnBibleReset" event, passing the `bibleData` to listeners.
 *
 * @param {Object} that - The context object containing the Bible data.
 * @param {StackBibleData} that.bibleData - The data structure representing the current Bible.
 *
 * @example
 * thisBot.ResetBible({ bibleData: someBibleData });
 */

import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";

const {
  bibleData,
  speedMultiplier = 1,
}: { bibleData: StackBibleData; speedMultiplier?: number } = that;
setTagMask(thisBot, "isBibleAnimating", true);
thisBot.vars.lastInteractedStackBibleData = bibleData;
shout("OnStackBibleResetStart", { bibleData });
thisBot.PlaySound({ soundName: "ResetBible" });
return bibleData.getStaticPiece("bibleTransformer")?.Reset?.({
  bibleData,
  speedMultiplier,
});
