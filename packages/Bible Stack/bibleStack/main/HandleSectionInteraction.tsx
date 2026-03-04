/**
    * This tag is called whenever a section is interacted by clicking or hovering it
    * It is in charge of managing whether to highlight or select a section
    * @param {Object} that - Object that contains important data for the function
    * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found at globalThis.BibleVizUtils.Data.tags.InteractionType
    * @param {Object} that.dragInfo? - Is optional and is the information received when the type of interaction is a drag
    * @param {Object} that.dropInfo? - Is optional and is the information received when the type of interaction is a drop
    * @example
    * thisBot.HandleSectionInteraction({section: someSection, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.Drag, dragInfo: someDraginfo});
*/

const {section, typeOfInteraction, dragInfo, dropInfo} = that;
if(thisBot.masks.isBibleAnimating && typeOfInteraction !== BibleVizUtils.Data.tags.InteractionType.PointerUp) return;
const sectionData = thisBot.GetPieceData({piece: section});
const {bibleData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: sectionData.parentDataIds});

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
                    BibleVizUtils.Functions.HighlightBiblePiece({data: sectionData});
                }
                else
                {
                    if(section.masks.isHighlighted)
                    {
                        if(!sectionData.isSplitIntoBooks)
                        {
                            thisBot.SelectSection({section});
                        }
                    }
                    else
                    {
                        thisBot.TryHighlightPiece({piece: section, highlightRequestSource: BibleVizUtils.Data.tags.InteractionType.Click, typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackSection});
                    }
                }
            }
            break;
            case BibleVizUtils.Data.tags.InteractionType.Tap: 
            {
                
                if(BibleVizUtils.Data.masks.isHighlightToolEnabled)
                {
                    BibleVizUtils.Functions.HighlightBiblePiece({data: sectionData});
                }
                else
                {
                    thisBot.SelectSection({section});

                }
            }
            break;
            case BibleVizUtils.Data.tags.InteractionType.HoverBegin:
            {
                thisBot.TryHighlightPiece({piece: section, highlightRequestSource: BibleVizUtils.Data.tags.InteractionType.HoverBegin, typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackSection});
            }
            break;
            case BibleVizUtils.Data.tags.InteractionType.HoverEnd:
            {
                thisBot.TryUnhighlightPiece({piece: section, delay: 4000, requestSource: BibleVizUtils.Data.tags.InteractionType.HoverEnd});
            }
            break;
            // case BibleVizUtils.Data.tags.InteractionType.SearchBarSelection:
            // {
            //     return thisBot.SelectSection({section});
            // }
            case BibleVizUtils.Data.tags.InteractionType.Drag:
            {
                if(section.tags.draggable) shout("OnStackPieceDrag", {piece: section, data: sectionData});
            }
            break;
            case BibleVizUtils.Data.tags.InteractionType.Dragging:
            {
                if(section.tags.draggable) shout('OnStackPieceDragging', {piece: section, dragInfo})
            }
            break;
            case BibleVizUtils.Data.tags.InteractionType.Drop:
            {
                if(section.tags.draggable) shout('OnStackPieceDrop', {piece: section, dropInfo});
            }
            break;
            case BibleVizUtils.Data.tags.InteractionType.PointerUp:
            {
                if(section.tags.draggable) shout('OnStackPiecePointerUp', {piece: section});
            }
            break;
            default: break;
        }
    }
}