import { LayoutBibleData } from "bibleVizUtils.classes.LayoutBibleData";

const { position } = that;

const layoutData = new LayoutBibleData({ id: uuid() });
const {
  layoutBookStructures,
  staticLayoutPieces,
  amountOfRows,
  sectionLinesInfo,
  testamentLinesInfo,
} = await thisBot.CreateLayoutStructure({ layoutData });

layoutBookStructures.forEach((layoutBookStructure: any) => {
  layoutData.AddChild(layoutBookStructure);
});
layoutData.amountOfRows = amountOfRows;
layoutData.sectionLinesInfo = sectionLinesInfo;
layoutData.testamentLinesInfo = testamentLinesInfo;
layoutData.staticLayoutPieces = staticLayoutPieces;
thisBot.vars.layoutsData.push(layoutData);
thisBot.SetUpLayout({ layoutData, position });

return { layoutData };
