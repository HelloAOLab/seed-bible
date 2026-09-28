/**
 * Hides the chunk of verses, animating their scale down if not selected, or hiding individual verses if selected.
 * @param {Object} that - Context object containing important data for the function.
 * @param {number} that.index - The index of the chunk of verses within its parent list of chunk of verses.
 * @param {string} that.dimension - Dimension where the animation will take place.
 * @param {number} that.delayBetweenAnimations - An specified delay between chunk of verses Hide animation.
 * @param {number} that.duration - The duration of the animation.
 * @example
 * chunkOfVerses.Hide({ index: 0, dimension: "home", delayBetweenAnimations: 0.1, duration: 1 });
 */

const { index, dimension, delayBetweenAnimations, duration } = that;
const easing = { type: "elastic", mode: "in" };
const delay = index * delayBetweenAnimations;
await os.sleep(delay);
if (thisBot.masks.isSelected) {
  const reversedVerses = thisBot.vars.verses.toReversed();
  await Promise.all(
    reversedVerses.map((verse, verseIndex) => {
      return verse.Hide({
        verseIndex,
        dimension,
        delayBetweenAnimations,
        duration,
      });
    })
  );
  thisBot.vars.verses.forEach((verse) => {
    ObjectPooler.ReleaseObject({ obj: verse, tag: verse.tags.poolTag });
  });
  thisBot.vars.verses.splice(0, thisBot.vars.verses.length);
} else {
  await animateTag(thisBot, "scaleZ", {
    toValue: 0,
    duration,
    easing,
  });
  setTagMask(thisBot, dimension, false);
}
return true;
