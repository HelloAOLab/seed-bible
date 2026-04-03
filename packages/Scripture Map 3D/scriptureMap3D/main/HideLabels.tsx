import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";

const {
  layoutData,
}: {
  layoutData: LayoutBibleData;
} = that;

const dimension = os.getCurrentDimension();
const pieces = [
  ...(layoutData.staticLayoutPieces.testamentLines ?? []),
  ...(layoutData.staticLayoutPieces.testamentLabels ?? []),
  ...(layoutData.staticLayoutPieces.sectionLines ?? []),
  ...(layoutData.staticLayoutPieces.sectionLabels ?? []),
];
setTag(pieces, dimension, false);

layoutData.childrenStructures.forEach((layoutBookStructure) => {
  setTag(layoutBookStructure.dateLabel, "labelColor", "black");
});
