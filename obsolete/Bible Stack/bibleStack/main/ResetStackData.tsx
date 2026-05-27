/**
 * Resets the data for all pieces within the Bible stack, including testaments, sections, books, and chapters.
 *
 * This function iterates over the Bible's data structure and releases any associated visual pieces back to the object pool.
 * It also resets various states and properties, including whether pieces are active, selected, split, or hidden.
 *
 * @param {Object} that - The context object containing the Bible data.
 * @param {StackBibleData} that.bibleData - The data structure representing the current Bible, including testaments and sections.
 *
 * @example
 * StacksManger.ResetStackData({ bibleData: someBibleData });
 */

import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";

const { bibleData }: { bibleData: StackBibleData } = that;

const piecesToRelease = bibleData.resetHierarchy();
for (const piece of piecesToRelease) {
  ObjectPooler.ReleaseObject({
    obj: piece,
    tag: piece.tags.poolTag,
  });
}
