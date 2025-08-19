const {book, typeOfInteraction} = that;
const layoutBookData = thisBot.GetElementData({element: book});
const layoutData = layoutBookData.parentDataIds && layoutBookData.parentDataIds.layoutId ? thisBot.GetLayoutDataById({layoutId: layoutBookData.parentDataIds.layoutId}) : null;

if(layoutData?.currentPlaylistShownId) return;

switch(typeOfInteraction)
{
    case BibleVizUtils.Data.tags.InteractionType.Click:
    {
        if(!thisBot.masks.isAnimatingMap)
        {
            if(InstanceManager.masks.isHighlightToolEnabled)
            {
                InstanceManager.HighlightBibleElement({data: layoutBookData});
            }
            else
            {
                if(!layoutBookData.isSelected)
                {
                    thisBot.SelectMapBook({layoutBookData, layoutData})
                }
            }
        }
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Drag:
    {
        if(book.tags.draggable) shout("OnMapElementDrag", {data: layoutBookData});
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Drop:
    {
        shout('OnMapElementDrop', {element: book, dropInfo});
    }
    break;
    default: break;
}