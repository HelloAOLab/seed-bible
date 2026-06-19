const { id } = that;
return thisBot.vars.stackChaptersData.find((chapterData) => {
  return chapterData.id == id;
});
