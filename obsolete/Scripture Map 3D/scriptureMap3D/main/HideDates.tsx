import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";

const {
  layoutData,
}: {
  layoutData: LayoutBibleData;
} = that;

const dimension = os.getCurrentDimension();

layoutData.childrenStructures.forEach((layoutBookStructure) => {
  layoutBookStructure.dateLabel.tags[dimension] = false;
});
