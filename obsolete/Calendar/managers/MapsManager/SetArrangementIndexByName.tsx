const { name } = that;
const arrangement = thisBot.tags.booksList.find((currentArrangement) => {
  return currentArrangement.name == name;
});
if (arrangement) {
  const index = thisBot.tags.booksList.indexOf(arrangement);
  thisBot.vars.arrangementIndex = index;
}
