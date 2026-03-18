import {
  ObjectPoolTags,
  type LayoutBookStructure,
} from "bibleVizUtils.models.canvas";

const {
  bookInfo,
  layoutDataId,
  column,
  row,
  structureIndex,
  arrangementIndex,
  testamentIndex,
  sectionIndex,
} = that;

const layoutBookData = await thisBot.CreateBook({
  bookInfo,
  layoutDataId,
  arrangementIndex,
  testamentIndex,
  sectionIndex,
});
const nameLabel = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutBookNameLabel,
});
const dateLabel = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutBookDateLabel,
});

const layoutBookNameLabelMod = { layoutId: layoutDataId };
nameLabel.OnSpawned({ mod: layoutBookNameLabelMod });
const layoutBookDateWroteMod = { layoutId: layoutDataId };
dateLabel.OnSpawned({ mod: layoutBookDateWroteMod });

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const { relativeDateRange } =
  BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName];
const historicalDateRange = `${Math.abs(relativeDateRange.min)}${relativeDateRange.min != relativeDateRange.max ? `-${Math.abs(relativeDateRange.max)}` : ``} ${relativeDateRange.min < 0 ? "B.C." : "A.D."}`;
const elapsedYearsRange = `${currentYear - relativeDateRange.min}${relativeDateRange.min != relativeDateRange.max ? `-${currentYear - relativeDateRange.max}` : ``} years ago`;

const layoutBookStructure: LayoutBookStructure = {
  layoutBookData,
  nameLabel,
  column,
  row,
  structureIndex,
  layoutId: layoutDataId,
  dateLabel,
  historicalDateRange,
  elapsedYearsRange,
  id: uuid(),
};
thisBot.vars.layoutBooksStructure.push(layoutBookStructure);
return layoutBookStructure;
