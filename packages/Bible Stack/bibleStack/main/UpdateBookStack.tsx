/**
 * Updates the position and animations of a specific book within the stack.
 * Adjusts the book's pieces based on the current state and dimension, handling any necessary animations.
 *
 * @param {Object} that - The object containing `bookData`.
 * @param {StackBookData} that.bookData - The book data to be updated within the stack.
 * @returns {Promise<boolean>} Resolves once all animations are completed.
 *
 * @example
 * thisBot.UpdateBookStack({ bookData: someBookData });
 */

const { bookData, isInstantaneous } = that;
const dimension = os.getCurrentDimension();
const animations = [];

const { newBookAnimations } = await thisBot.HandleBookDataInStack({
  dimension,
  bookData,
  isInstantaneous,
});
animations.push(...newBookAnimations);

await Promise.allSettled(animations);

return true;
