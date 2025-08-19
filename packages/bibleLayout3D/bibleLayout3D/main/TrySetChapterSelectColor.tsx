const {layoutData} = that;
const color = await os.showInput(thisBot.tags.currentColor, {
    type: 'color'
});
if(color)
{
    layoutData.chapterSelectColor = color;
    layoutData.staticLayoutElements.colorPickerContent.tags.color = color;
}