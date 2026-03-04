const {mapChapterData, mapData} = that;

mapChapterData.isSelected = true
shout("OnBibleElementSelected", {element: mapChapterData.element});
if(mapData?.isPathEnabled) 
{
    if(mapData.currentSelectedChapterData) 
    {
        mapData.currentSelectedChapterData.element.tags.lineTo = mapChapterData.element.tags.id;
        mapData.currentSelectedChapterData.element.tags.lineWidth = 4;
        mapData.currentSelectedChapterData.element.tags.lineColor = mapData.chapterSelectColor;
    }
    mapData.currentSelectedChapterData = mapChapterData;
}
if(mapData?.isCameraAnimationEnabled)
{
    const dimension = os.getCurrentDimension();
    os.focusOn({
        x: mapChapterData.element.tags[dimension+"X"] + 1,
        y: mapChapterData.element.tags[dimension+"Y"] + 1,
        z: 1.5
    },{rotation: {x: 0.3, y: 0.3, z: 0}})
}
InstanceManager.TryHideUsersNotificationOnElement({element: mapChapterData.element})
return mapChapterData.element.Select({mapData})