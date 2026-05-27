import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";

const { layoutData }: { layoutData: LayoutBibleData } = that;
const color = await os.showInput(thisBot.tags.currentColor, {
  type: "color",
});
if (color) {
  layoutData.changeSelectColor(color);
  if (layoutData.staticLayoutPieces.colorPickerContent) {
    layoutData.staticLayoutPieces.colorPickerContent.tags.color = color;
  }
}
