const {piece} = that;
let currUsersColor;

switch(piece.tags.poolTag)
{
    case BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer:
        currUsersColor = piece.GetLabelElements().infoLabelUsersColor;
    break;
    case BibleVizUtils.Data.tags.ObjectPoolTags.Chapter:
    case BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBook:
    case BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapter: 
    {
        const pieceData = piece.tags.poolTag == BibleVizUtils.Data.tags.ObjectPoolTags.Chapter ? BibleStackManager.GetBibleElementData({piece}) :
            BibleLayout3DManager.GetPieceData({piece})
        currUsersColor = getBots(byTag("isUserColor", true), byTag("ownerDataId", pieceData.id), byTag("isInUse", true));
    }
    break;
}
return currUsersColor;