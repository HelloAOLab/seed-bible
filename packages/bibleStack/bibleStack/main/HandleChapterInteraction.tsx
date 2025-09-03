/**
    * This tag is called whenever a chapter is interacted
    * It is in charge of managing whether to select, deselect, highlight, drag or drop a chapter if possible.
    * @param {Object} that - Object that contains important data for the function
    * @param {StackChapterData} that.chapterData - The chapterData that holds the reference to the chapter transformer, chapter front, chapter back, and some more important informati    * @param {ChapStringat.chaptypeOfInteractionhe Represents the type of interaction. Possible values can be found at globalThis.BibleVizUtils.Data.tags.InteractionType
    * @param {Object} that.dragInfo? - Is optional and is the information received when the type of interaction is a drag
    * @param {Object} that.dropInfo? - Is optional and is the information received when the type of interaction is a drop
    * @example
    * shout("HandleChapterInteraction", {chapterData: someChapterData, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Click});
*/

const {chapterData, typeOfInteraction, dragInfo, dropInfo} = that;
const {sectionBookData, bookData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: chapterData.parentDataIds});
const actualData = sectionBookData ?? bookData;
if(thisBot.masks.isBibleAnimating) return;

switch(typeOfInteraction)
{
    case BibleVizUtils.Data.tags.InteractionType.Click:
    {
        if(BibleVizUtils.Data.masks.isHighlightToolEnabled)
        {
            BibleVizUtils.Functions.HighlightBiblePiece({data: chapterData});
        }
        else
        {
            if(!chapterData.piece.masks.isSelecting && !chapterData.piece.masks.isDeselecting)
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
                    // OpenBibleAt(`${chapterData.piece.tags.parentBookName} ${chapterData.piece.tags.chapterNumber}:0`)
                }
            }
        }
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.HoverBegin:
    {
        if(!chapterData.piece.masks.isBeingDragged) thisBot.TryHighlightChapter({parentData: actualData, chapterData});
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.HoverEnd:
    {
        if(!chapterData.piece.masks.isBeingDragged    && 
            chapterData.piece.masks.isOnTheGround     && 
            !chapterData.piece.masks.isSelecting      &&
            !chapterData.piece.masks.isDeselecting) 
        {
            chapterData.piece.Unhighlight({chapterData}).then(() => {
                if(!chapterData.isSelected) BibleVizUtils.Functions.UpdateUsersNotificationOnPieces({piecesData: [chapterData], manager: thisBot})
            });
        }
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Drag:
    {
        if(chapterData.piece.tags.draggable) shout("OnStackPieceDrag", {data: chapterData, piece: chapterData.piece});
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Dragging:
    {
        shout('OnStackPieceDragging', {piece: chapterData.piece, dragInfo, data: chapterData})
    }
    break;
    case BibleVizUtils.Data.tags.InteractionType.Drop:
    {
        shout('OnStackPieceDrop', {data: chapterData, piece: chapterData.piece, dropInfo});
    }
    break;
    default: break;
}