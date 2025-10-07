const dimension = os.getCurrentDimension();

const baseArrangementBook = getBot("isArrangementBookClone", true);

const activatedCloneBook = getBot(
  byTag("isArrangementBookClone", true),
  byTag("initialized", true)
);

if (activatedCloneBook) return;

const xOffSet = that?.x || 0;
const yOffSet = that?.y || 0;
const zOffSet = that?.z || 0;

const clonedBook = create(baseArrangementBook, {
  [dimension]: true,
  [dimension + "X"]: thisBot.tags[dimension + "X"] + 4,
  [dimension + "Y"]: thisBot.tags[dimension + "Y"] - 4,
  [dimension + "Z"]: thisBot.tags[dimension + "Z"],
  xOffSet,
  yOffSet,
  zOffSet,
  desiredPositionZ: thisBot.tags.desiredPositionZ,
  space: "tempLocal",
  transformer: thisBot.tags.transformer,
  color: thisBot.tags.orginalColor,
  bookIndex: thisBot.tags.bookIndex,
  creator: null,
  bookName: thisBot.tags.bookName,
  sectionName: thisBot.tags.sectionName,
  label: thisBot.tags.bookName,
  labelColor: thisBot.tags.labelColor,
  labelOpacity: 1,
  numberOfChapters: thisBot.tags.numberOfChapters,
  bookRank: thisBot.tags.bookRank,
  sectionRank: thisBot.tags.sectionRank,
  isClone: true,
  labelFontSize: 2,
  labelPosition: "front",
  initialized: true,
});

setTag(thisBot, "cloneBookID", clonedBook.id);

globalThis.continousRotateBot(clonedBook, dimension);
