const { mapData } = that;
const color = await os.showInput(thisBot.tags.currentColor, {
  type: "color",
});
if (color) {
  mapData.chapterSelectColor = color;
  mapData.staticMapElements.colorPickerContent.tags.color = color;
}
