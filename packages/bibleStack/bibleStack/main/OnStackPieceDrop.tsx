/**
    * Handles the dropping of a stack piece, updating its position and managing interactions based on the drop info.
    *
    * @param {Object} that - The context object containing the piece, data, and drop information.
    * @param {Object} that.piece - The piece being dropped.
    * @param {Object} that.data - The data associated with the piece being dropped.
    * @param {Object} that.dropInfo - Information about where the piece is being dropped.
    * @example
    * shout('OnStackPieceDrop', {data: someStackPieceData, piece: someStackPiece, dropInfo: someDropInfo});
*/

import {StackChapterData} from "BibleVizUtils.Classes.StackChapterData"
import {StackSectionData} from "BibleVizUtils.Classes.StackSectionData"
import {StackBookData} from "BibleVizUtils.Classes.StackBookData"
import {StackTestamentData} from "BibleVizUtils.Classes.StackTestamentData"

const {piece, data, dropInfo} = that;
const dimension = os.getCurrentDimension();
const piecePosition = getBotPosition(piece, dimension);
let newPosition;
let justGrounded;
setTagMask(piece, 'isBeingDragged', false);
if(!dropInfo?.to.bot && !piece.masks.isOnTheGround)
{
    justGrounded = true;
    setTagMask(piece, "isOnTheGround", true);
    if(!(data instanceof StackChapterData)) setTagMask(piece, "highlightable", true);
}
if(piece.tags.transformer)
{
    const transformer = getBot(byID(piece.tags.transformer));
    const transformerPosition = getBotPosition(transformer, dimension);
    newPosition = piecePosition.add(transformerPosition);
    setTag(piece, "transformer", null);
    setTagMask(piece, dimension + "X", newPosition.x);
    setTagMask(piece, dimension + "Y", newPosition.y);
    setTagMask(piece, dimension + "Z", newPosition.z);
}
if(data instanceof StackChapterData && data.isSelected && justGrounded)
{
    const {sectionBookData, bookData} = thisBot.GetDataChainFromParentDataIds({parentDataIds: data.parentDataIds});
    const actualData = bookData ?? sectionBookData;
    thisBot.DeselectChapter({chapterData: data, setBibleAnimating: true}).then(() => {
        thisBot.TrySelectChapter({chapterData: data, bookData: actualData});
    });
}
else
{
    setTag(piece, "desiredPositionZ", newPosition ? newPosition.z : piecePosition.z);
    if(piece.masks.isBeingHovered)
    {
        thisBot.TryHighlightPiece({piece, highlightRequestSource: BibleVizUtils.Data.tags.InteractionType.Drop, typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.Testament});
    }
}

switch(true)
{
    case data instanceof StackTestamentData:
        thisBot.vars.lastInteractedStackTestamentData = data;
    break;
    case data instanceof StackSectionData:
        thisBot.vars.lastInteractedStackSectionData = data;
    break;
    case data instanceof StackBookData:
        thisBot.vars.lastInteractedStackBookData = data;
    break;
    default: break;
}