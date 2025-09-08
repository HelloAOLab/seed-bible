/**
 * Updates the position and animations of a specific book within the stack.
 * Adjusts the book's elements based on the current state and dimension, handling any necessary animations.
 *
 * @param {Object} that - The object containing `bookData`.
 * @param {BookData} that.bookData - The book data to be updated within the stack.
 * @returns {Promise<boolean>} Resolves once all animations are completed.
 *
 * @example
 * StacksManager.UpdateBookStack({ bookData: someBookData });
 */

const {bookData, isInstantaneous} = that;
const dimension = os.getCurrentDimension();
let animations = [];

const {newBookAnimations} = HandleBookDataInStack({dimension, bookData, isInstantaneous});
animations.push(...newBookAnimations);

await Promise.allSettled(animations);

return true;