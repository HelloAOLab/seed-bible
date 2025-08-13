/**
    * This tag is called whenever a chapter is interacted
    * It is in charge of managing whether to select, deselect, highlight, drag or drop a chapter if possible.
    * @param {Object} that - Object that contains important data for the function
    * @param {ChapterData} that.chapterData - The chapterData that holds the reference to the chapter transformer, chapter front, chapter back, and some more important informati    * @param {ChapStringat.chaptypeOfInteractionhe Represents the type of interaction. Possible values can be found at globalThis.StackElementInteractionType
    * @param {Object} that.dragInfo? - Is optional and is the information received when the type of interaction is a drag
    * @param {Object} that.dropInfo? - Is optional and is the information received when the type of interaction is a drop
    * @example
    * shout("HandleChapterInteraction", {chapterData: someChapterData, typeOfInteraction: StackElementInteractionType.Click});
*/

const {chapterData, typeOfInteraction, dragInfo, dropInfo} = that;
const {sectionBookData, bookData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: chapterData.parentDataIds});
const actualData = sectionBookData ?? bookData;
if(thisBot.masks.isBibleAnimating) return;

switch(typeOfInteraction)
{
    case StackElementInteractionType.Click:
    {
        if(InstanceManager.masks.isHighlightToolEnabled)
        {
            InstanceManager.HighlightBibleElement({data: chapterData});
        }
        else
        {
            if(!chapterData.element.masks.isSelecting && !chapterData.element.masks.isDeselecting)
            {
                if(chapterData.isSelected)
                {
                    if(!actualData)
                    {
                        thisBot.DeselectChapter({chapterData, setBibleAnimating: true});
                    }
                }
                else
                {
                    thisBot.TrySelectChapter({chapterData, bookData: actualData});
                    // if(globalThis?.OpenBibleAt === undefined){
                    //     shout("runThePage")
                    //     await os.sleep(1000);
                    // }
                    // OpenBibleAt(`${chapterData.element.tags.parentBookName} ${chapterData.element.tags.chapterNumber}:0`)
                }
            }
        }
    }
    break;
    case StackElementInteractionType.HoverBegin:
    {
        if(!chapterData.element.masks.isBeingDragged) thisBot.TryHighlightChapter({parentData: actualData, chapterData});
    }
    break;
    case StackElementInteractionType.HoverEnd:
    {
        if(!chapterData.element.masks.isBeingDragged    && 
            chapterData.element.masks.isOnTheGround     && 
            !chapterData.element.masks.isSelecting      &&
            !chapterData.element.masks.isDeselecting) 
        {
            chapterData.element.Unhighlight({chapterData}).then(() => {
                if(!chapterData.isSelected) InstanceManager.UpdateUsersNotificationOnElements({elementsData: [chapterData]})
            });
        }
    }
    break;
    case StackElementInteractionType.Drag:
    {
        if(chapterData.element.tags.draggable) shout("OnStackElementDrag", {data: chapterData, element: chapterData.element});
    }
    break;
    case StackElementInteractionType.Dragging:
    {
        shout('OnStackElementDragging', {element: chapterData.element, dragInfo, data: chapterData})
    }
    break;
    case StackElementInteractionType.Drop:
    {
        shout('OnStackElementDrop', {data: chapterData, element: chapterData.element, dropInfo});
    }
    break;
    default: break;
}