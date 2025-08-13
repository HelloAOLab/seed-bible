const {mapChapterData, mapData} = that;

mapChapterData.isSelected = false;
InstanceManager.TryHideUsersColorOnElement({element: mapChapterData.element});
const previousLinkedChapter = getBot("lineTo", mapChapterData.element.id);
if(mapData.currentSelectedChapterData?.id == mapChapterData.id)
{
    if(previousLinkedChapter) 
    {
        const previousChapterData = MapsManager.GetMapElementData({element: previousLinkedChapter})
        mapData.currentSelectedChapterData = previousChapterData;
    }
    else mapData.currentSelectedChapterData = null;
}
if(previousLinkedChapter) previousLinkedChapter.tags.lineTo = null;
mapChapterData.element.tags.lineTo = null;
return mapChapterData.element.Deselect();