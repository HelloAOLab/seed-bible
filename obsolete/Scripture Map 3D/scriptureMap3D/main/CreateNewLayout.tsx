import { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";
import type { LayoutBookStructure } from "bibleVizUtils.models.canvas";

const { position } = that;

const layoutDataId = uuid();
const {
  layoutBookStructures,
  staticLayoutPieces,
  amountOfRows,
  sectionLinesInfo,
  testamentLinesInfo,
}: {
  layoutBookStructures: LayoutBookStructure[];
} = await thisBot.CreateLayoutStructure({ layoutDataId });

const layoutData = new LayoutBibleData({
  id: layoutDataId,
  amountOfRows,
  sectionLinesInfo,
  testamentLinesInfo,
  staticLayoutPieces,
});
layoutBookStructures.forEach((layoutBookStructure) => {
  layoutData.addChild(layoutBookStructure);
});
thisBot.vars.layoutsData.push(layoutData);
thisBot.SetUpLayout({ layoutData, position });

return { layoutData };
