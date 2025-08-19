const {element} = that;
let currUsersColor;

switch(element.tags.poolTag)
{
    case BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer:
        currUsersColor = element.GetLabelElements().infoLabelUsersColor;
    break;
    case BibleVizUtils.Data.tags.ObjectPoolTags.Chapter:
    case BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBook:
    case BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapter: 
    {
        const elementData = element.tags.poolTag == BibleVizUtils.Data.tags.ObjectPoolTags.Chapter ? BibleStackManager.GetBibleElementData({element}) :
            BibleLayout3DManager.GetElementData({element})
        currUsersColor = getBots(byTag("isUserColor", true), byTag("ownerDataId", elementData.id), byTag("isInUse", true));
    }
    break;
}
return currUsersColor;