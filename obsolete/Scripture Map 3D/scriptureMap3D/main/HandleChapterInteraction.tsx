const {chapter, typeOfInteraction} = that;
const chapterData = thisBot.GetPieceData({piece: chapter});
const originalLayoutData = thisBot.GetLayoutDataById({layoutId: chapterData.originalLayoutId})

if(originalLayoutData?.currentPlaylistShownId) return;

switch(typeOfInteraction)
{
    case BibleVizUtils.Data.tags.InteractionType.Click:
    {
        
        if(!thisBot.masks.isAnimatingBible)
        {
            if(BibleVizUtils.Data.masks.isHighlightToolEnabled)
            {
                BibleVizUtils.Functions.HighlightBiblePiece({data: chapterData});
            }
            else
            {
                if(!chapter.masks.isSelecting && !chapter.masks.isDeselecting)
                {
                    if(chapterData.isSelected)
                    {
                        thisBot.DeselectChapter({chapterData, layoutData: originalLayoutData})
                    }
                    else
                    {
                        thisBot.TrySelectChapter({chapterData, layoutData: originalLayoutData});
                    }
                }
            }
        }
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.HoverBegin:
    {
        thisBot.TryHighlightChapter({chapterData});
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.HoverEnd:
    {
        thisBot.TryUnhighlightChapter({chapterData});
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Drag:
    {
        shout(`OnLayoutPieceDrag`, {data: chapterData})
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Drop:
    {
        setTagMask(chapter, 'isBeingDragged', false);
        if(originalLayoutData.isChapterExpandEnabled)
        {
            (chapterData.isSelected ? thisBot.DeselectChapter({chapterData, layoutData: originalLayoutData}) : Promise.resolve())
            .then(() => {thisBot.TrySelectChapter({chapterData, layoutData: originalLayoutData});})
        }
        else
        {
            if(!chapterData.piece.masks.hovered) thisBot.UserPresenceUpdate();
        }
    }
    break;
    default: break;
}