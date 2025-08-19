const {chapter, typeOfInteraction} = that;
const chapterData = thisBot.GetElementData({element: chapter});
const originalLayoutData = thisBot.GetLayoutDataById({layoutId: chapterData.originalLayoutId})

if(originalLayoutData?.currentPlaylistShownId) return;

switch(typeOfInteraction)
{
    case BibleVizUtils.Data.tags.InteractionType.Click:
    {
        
        if(!thisBot.masks.isAnimatingMap)
        {
            if(BibleVizUtils.Data.masks.isHighlightToolEnabled)
            {
                BibleVizUtils.Functions.HighlightBibleElement({data: chapterData});
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
        shout(`OnLayoutElementDrag`, {data: chapterData})
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Drop:
    {
        setTagMask(chapter, 'isBeingDragged', false);
        if(chapterData.isSelected)
        {
            if(chapterData.element.masks.isExpanded || originalLayoutData.isChapterExpandEnabled)
            {
                thisBot.DeselectChapter({chapterData, layoutData: originalLayoutData}).then(() => {thisBot.TrySelectChapter({chapterData, layoutData: originalLayoutData});})
            }
        }
        else
        {
            if(originalLayoutData.isChapterExpandEnabled)
            {
                thisBot.TrySelectChapter({chapterData, layoutData: originalLayoutData});
            }
        }
    }
    break;
    default: break;
}