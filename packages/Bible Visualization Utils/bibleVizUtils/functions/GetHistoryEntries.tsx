const { typeOfPiece, key } = that;

const entries = BibleVizUtils.Data.vars.history.filter((entry) => {
  return entry.typeOfPiece == typeOfPiece && entry.key == key;
});
return entries;
