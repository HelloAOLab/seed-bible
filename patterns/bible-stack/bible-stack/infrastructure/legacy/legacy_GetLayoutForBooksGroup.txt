/**
 * Returns the respective layout depending on the given group book
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.book - The book to be checked
 * @example
 * const layout = StackManager.GetLayoutForBooksGroup({amountOfBooks: someAmountOfBooks});
 */

const { amountOfBooks } = that;
if (amountOfBooks < 2) {
  return null;
}

const layout = thisBot.tags.sectionGroupsLayouts.find((layout) => {
  return layout.amountOfBooks === amountOfBooks;
})?.layout;
return layout;
