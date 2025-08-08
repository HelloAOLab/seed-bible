const {element} = that;
let currUsersColor;

switch(element.tags.poolTag)
{
    case ObjectPoolTags.InfoLabelTransformer:
        currUsersColor = element.GetLabelElements().infoLabelUsersColor;
    break;
    case ObjectPoolTags.Chapter:
    case ObjectPoolTags.MapBook:
    case ObjectPoolTags.MapChapter:
        const elementData = element.tags.poolTag == ObjectPoolTags.Chapter ? StacksManager.GetBibleElementData({element}) :
            MapsManager.GetMapElementData({element})
        currUsersColor = getBots(byTag("isUserColor", true), byTag("ownerDataId", elementData.id), byTag("isInUse", true));
    break;
}
return currUsersColor;