/**
    * This tag is called whenever a testament is interacted by clicking or hovering it
    * It is in charge of managing whether to highlight or select a testament
    * @param {Object} that - Object that contains important data for the function
    * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found on interactiveBible.managers.StackManager.DefineGlobals on BibleVizUtils.Data.tags.InteractionType
    * @param {Object} that.dragInfo? - Is optional and is the information received when the type of interaction is a drag
    * @param {Object} that.dropInfo? - Is optional and is the information received when the type of interaction is a drop
    * @example
    * thisBot.HandleTestamentInteraction({testament: someTestament, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Drag, dragInfo: someDragInfo});
*/

const {testament, typeOfInteraction, dragInfo, dropInfo} = that;

if(thisBot.masks.isBibleAnimating && typeOfInteraction !== BibleVizUtils.Data.tags.InteractionType.PointerUp) return;

const testamentData = thisBot.GetPieceData({piece: testament});
const {bibleData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: testamentData.parentDataIds});

if(!bibleData || bibleData.currentState === BibleVizUtils.Data.tags.BibleState.Open)
{
    if(!thisBot.masks.isASectionMakingTourGuide)
    {
        switch(typeOfInteraction)
        {
            case BibleVizUtils.Data.tags.InteractionType.Click:
            {
                if(BibleVizUtils.Data.masks.isHighlightToolEnabled)
                {
                    BibleVizUtils.Functions.HighlightBiblePiece({data: testamentData});
                }
                else
                {
                    if(testament.tags.isHighlighted)
                    {
                        thisBot.SelectTestament({testament});
                    }
                    else
                    {
                        thisBot.TryHighlightPiece({piece: testament, highlightRequestSource: BibleVizUtils.Data.tags.InteractionType.Click, typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackTestament});
                    }
                }
            }
            break;
            case BibleVizUtils.Data.tags.InteractionType.Tap: 
            {
                if(BibleVizUtils.Data.masks.isHighlightToolEnabled)
                {
                    BibleVizUtils.Functions.HighlightBiblePiece({data: testamentData});
                }
                else
                {
                    thisBot.SelectTestament({testament});
                }
            }
            break;
            case BibleVizUtils.Data.tags.InteractionType.HoverBegin:
            {
                thisBot.TryHighlightPiece({piece: testament, highlightRequestSource: BibleVizUtils.Data.tags.InteractionType.HoverBegin, typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackTestament});
            }
            break;
            case BibleVizUtils.Data.tags.InteractionType.Drag:
            {
                if(testament.tags.draggable) shout("OnStackPieceDrag", {piece: testament, data: testamentData});
            }
            break;
            case BibleVizUtils.Data.tags.InteractionType.Dragging:
            {
                if(testament.tags.draggable) shout('OnStackPieceDragging', {piece: testament, dragInfo});
            }
            break;
            case BibleVizUtils.Data.tags.InteractionType.Drop:
            {
                if(testament.tags.draggable) shout('OnStackPieceDrop', {piece: testament, dropInfo});
            }
            break;
            case BibleVizUtils.Data.tags.InteractionType.PointerUp:
            {
                if(testament.tags.draggable) shout('OnStackPiecePointerUp', {piece: testament});
            }
            break;
            // case BibleVizUtils.Data.tags.InteractionType.SearchBarSelection:
            // {
            //     return thisBot.SelectTestament({testament});
            // }
            default: break;
        }
    }
}