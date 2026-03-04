const {book, typeOfInteraction} = that;
const layoutBookData = thisBot.GetPieceData({piece: book});
const layoutData = layoutBookData.parentDataIds && layoutBookData.parentDataIds.layoutId ? thisBot.GetLayoutDataById({layoutId: layoutBookData.parentDataIds.layoutId}) : null;

if(layoutData?.currentPlaylistShownId) return;

switch(typeOfInteraction)
{
    case BibleVizUtils.Data.tags.InteractionType.Click:
    {
        if(!thisBot.masks.isAnimatingBible)
        {
            if(BibleVizUtils.Data.masks.isHighlightToolEnabled)
            {
                BibleVizUtils.Functions.HighlightBiblePiece({data: layoutBookData});
            }
            else
            {
                if(!layoutBookData.isSelected)
                {
                    thisBot.SelectBook({layoutBookData, layoutData})
                }
            }
        }
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Drag:
    {
        if(book.tags.draggable) shout("OnLayoutPieceDrag", {data: layoutBookData});
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Drop:
    {
        shout('OnLayoutPieceDrop', {piece: book, dropInfo});
    }
    break;
    default: break;
}