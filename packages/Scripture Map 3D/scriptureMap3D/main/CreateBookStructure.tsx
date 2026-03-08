import { LayoutBookStructure } from "bibleVizUtils.classes.LayoutBookStructure";
import { ObjectPoolTags } from "bibleVizUtils.models.canvas.models";

const {
  bookInfo,
  layoutData,
  column,
  row,
  structureIndex,
  arrangementIndex,
  testamentIndex,
  sectionIndex,
} = that;

const layoutBookData = await thisBot.CreateBook({
  bookInfo,
  layoutData,
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

const layoutBookNameLabelMod = { layoutId: layoutData.id };
nameLabel.OnSpawned({ mod: layoutBookNameLabelMod });
const layoutBookDateWroteMod = { layoutId: layoutData.id };
dateLabel.OnSpawned({ mod: layoutBookDateWroteMod });

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const { relativeDateRange } =
  BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName];
const historicalDateRange = `${Math.abs(relativeDateRange.min)}${relativeDateRange.min != relativeDateRange.max ? `-${Math.abs(relativeDateRange.max)}` : ``} ${relativeDateRange.min < 0 ? "B.C." : "A.D."}`;
const elapsedYearsRange = `${currentYear - relativeDateRange.min}${relativeDateRange.min != relativeDateRange.max ? `-${currentYear - relativeDateRange.max}` : ``} years ago`;

const layoutBookStructure = new LayoutBookStructure({
  layoutBookData,
  nameLabel,
  column,
  row,
  structureIndex,
  layoutId: layoutData.id,
  dateLabel,
  historicalDateRange,
  elapsedYearsRange,
});
thisBot.vars.layoutBooksStructure.push(layoutBookStructure);
return layoutBookStructure;
