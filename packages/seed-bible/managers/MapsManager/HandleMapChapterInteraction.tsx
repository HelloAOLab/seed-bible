const {mapChapter, typeOfInteraction} = that;
const mapChapterData = thisBot.GetMapElementData({element: mapChapter});
const originalMapData = thisBot.GetMapDataById({mapId: mapChapterData.originalMapId})

if(originalMapData?.currentPlaylistShownId) return;

switch(typeOfInteraction)
{
    case StackElementInteractionType.Click:
    {
        
        if(!thisBot.masks.isAnimatingMap)
        {
            if(InstanceManager.masks.isHighlightToolEnabled)
            {
                InstanceManager.HighlightBibleElement({data: mapChapterData});
            }
            else
            {
                if(!mapChapter.masks.isSelecting && !mapChapter.masks.isDeselecting)
                {
                    if(mapChapterData.isSelected)
                    {
                        thisBot.DeselectChapter({mapChapterData, mapData: originalMapData})
                    }
                    else
                    {
                        thisBot.TrySelectChapter({mapChapterData, mapData: originalMapData});
                    }
                }
            }
        }
    }
    break;
    case StackElementInteractionType.HoverBegin:
    {
        thisBot.TryHighlightChapter({mapChapterData});
    }
    break;
    case StackElementInteractionType.HoverEnd:
    {
        thisBot.TryUnhighlightChapter({mapChapterData});
    }
    break;
    case StackElementInteractionType.Drag:
    {
        shout(`OnMapElementDrag`, {data: mapChapterData})
    }
    break;
    case StackElementInteractionType.Drop:
    {
        setTagMask(mapChapter, 'isBeingDragged', false);
        if(mapChapterData.isSelected)
        {
            if(mapChapterData.element.masks.isExpanded || originalMapData.isChapterExpandEnabled)
            {
                thisBot.DeselectChapter({mapChapterData, mapData: originalMapData}).then(() => {thisBot.TrySelectChapter({mapChapterData, mapData: originalMapData});})
            }
        }
        else
        {
            if(originalMapData.isChapterExpandEnabled)
            {
                thisBot.TrySelectChapter({mapChapterData, mapData: originalMapData});
            }
        }
    }
    break;
    default: break;
}