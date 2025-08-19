const {chapterData, layoutData} = that;

chapterData.isSelected = true
shout("OnBibleElementSelected", {element: chapterData.element});
if(layoutData?.isPathEnabled) 
{
    if(layoutData.currentSelectedChapterData) 
    {
        layoutData.currentSelectedChapterData.element.tags.lineTo = chapterData.element.tags.id;
        layoutData.currentSelectedChapterData.element.tags.lineWidth = 4;
        layoutData.currentSelectedChapterData.element.tags.lineColor = layoutData.chapterSelectColor;
    }
    layoutData.currentSelectedChapterData = chapterData;
}
if(layoutData?.isCameraAnimationEnabled)
{
    const dimension = os.getCurrentDimension();
    os.focusOn({
        x: chapterData.element.tags[dimension+"X"] + 1,
        y: chapterData.element.tags[dimension+"Y"] + 1,
        z: 1.5
    },{rotation: {x: 0.3, y: 0.3, z: 0}})
}
BibleVizUtis.Functions.TryHideUsersNotificationOnElement({element: chapterData.element})
return chapterData.element.Select({layoutData})