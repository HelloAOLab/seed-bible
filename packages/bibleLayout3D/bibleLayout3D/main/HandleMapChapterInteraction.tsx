const {mapChapter, typeOfInteraction} = that;
const chapterData = thisBot.GetElementData({element: mapChapter});
const originalMapData = thisBot.GetLayoutDataById({layoutId: chapterData.originalLayoutId})

if(originalMapData?.currentPlaylistShownId) return;

switch(typeOfInteraction)
{
    case BibleVizUtils.Data.tags.InteractionType.Click:
    {
        
        if(!thisBot.masks.isAnimatingMap)
        {
            if(InstanceManager.masks.isHighlightToolEnabled)
            {
                InstanceManager.HighlightBibleElement({data: chapterData});
            }
            else
            {
                if(!mapChapter.masks.isSelecting && !mapChapter.masks.isDeselecting)
                {
                    if(chapterData.isSelected)
                    {
                        thisBot.DeselectChapter({chapterData, layoutData: originalMapData})
                    }
                    else
                    {
                        thisBot.TrySelectChapter({chapterData, layoutData: originalMapData});
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
        shout(`OnMapElementDrag`, {data: chapterData})
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Drop:
    {
        setTagMask(mapChapter, 'isBeingDragged', false);
        if(chapterData.isSelected)
        {
            if(chapterData.element.masks.isExpanded || originalMapData.isChapterExpandEnabled)
            {
                thisBot.DeselectChapter({chapterData, layoutData: originalMapData}).then(() => {thisBot.TrySelectChapter({chapterData, layoutData: originalMapData});})
            }
        }
        else
        {
            if(originalMapData.isChapterExpandEnabled)
            {
                thisBot.TrySelectChapter({chapterData, layoutData: originalMapData});
            }
        }
    }
    break;
    default: break;
}