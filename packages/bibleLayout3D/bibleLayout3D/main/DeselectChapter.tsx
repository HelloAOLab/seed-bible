const {chapterData, layoutData} = that;

chapterData.isSelected = false;
BibleVizUtils.Functions.TryHideUsersColorOnElement({element: chapterData.element});
const previousLinkedChapter = getBot("lineTo", chapterData.element.id);
if(layoutData.currentSelectedChapterData?.id == chapterData.id)
{
    if(previousLinkedChapter) 
    {
        const previousChapterData = thisBot.GetElementData({element: previousLinkedChapter})
        layoutData.currentSelectedChapterData = previousChapterData;
    }
    else layoutData.currentSelectedChapterData = null;
}
if(previousLinkedChapter) previousLinkedChapter.tags.lineTo = null;
chapterData.element.tags.lineTo = null;
return chapterData.element.Deselect();