/**
    * Sets the position of the info label transformer relative to its owner bot and transformer.
    * It adjusts the label's offset and positioning based on its settings.
    * 
    * @param {object} that - Object containing important data for the function
    * @param {boolean} that.setX - Determines if the X position needs to be set
    * @param {boolean} that.setY - Determines if the Y position needs to be set
    * @param {boolean} that.setZ - Determines if the Z position needs to be set
    * @param {boolean} that.setLabelOffset - Determines if the label offset position needs to be set
    * 
    * @example
    * infoLabelTransformer.SetPosition({setX: true, setY: true, setZ: true, setLabelOffset: false})
*/

const {setX, setY, setZ, setLabelOffset} = that;

const dimension = os.getCurrentDimension();
const ownerBot = getBot(byID(thisBot.tags.ownerBotId));
const transformer = ownerBot.tags.transformer ? getBot(byID(ownerBot.tags.transformer)) : null
// const ownerBotData = StacksManager.GetBibleElementData({element: ownerBot});
// const {bibleData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: ownerBotData.parentDataIds});
const infoLabelTransformerScales = GetBotScales(thisBot);
const ownerBotPosition = getBotPosition(ownerBot, dimension);
const ownerBotScales = GetBotScales(ownerBot);
const transformerOffset = 1;
const infoLabelTransformerScaleZ = 1;
const transformerPosition = transformer ? getBotPosition(transformer, dimension).add(new Vector3(0, 0, transformerOffset)) : new Vector3(0, 0, 0);
const infoLabelTransformerDesiredPosition = new Vector3(
    ownerBotPosition.x, 
    ownerBotPosition.y, 
    ownerBotPosition.z + (ownerBotScales.z / ((thisBot.tags.labelPositioning ===  LabelPositioning.Top ||  thisBot.tags.labelPositioning === LabelPositioning.RightSidedCorner) ? 1 : 2)) - (infoLabelTransformerScales.z / 2) + (thisBot.tags.labelPositioning === LabelPositioning.RightSidedCorner ? 1.5 : 0)
).add(transformerPosition);
const dateGapX = 0.2;

if(setX) setTagMask(thisBot, dimension + "X", infoLabelTransformerDesiredPosition.x);
if(setY) setTagMask(thisBot, dimension + "Y", infoLabelTransformerDesiredPosition.y);
if(setZ) setTagMask(thisBot, dimension + "Z", infoLabelTransformerDesiredPosition.z);
if(setLabelOffset && thisBot.tags.labelPositioning !== LabelPositioning.Top)
{
    const {infoLabel, infoLabelTail, infoLabelDate} = thisBot.GetLabelElements();

    const infoLabelScales = GetBotScales(infoLabel);
    const infoLabelTailScales = GetBotScales(infoLabelTail);
    const infoLabelDateScales = infoLabelDate ? GetBotScales(infoLabelDate) : null;
    const radialVector = new Vector2(ownerBotScales.x/2, ownerBotScales.y/2)
    const infoLabelOffsetMargin = 1;
    let infoLabelOffsetX, infoLabelTailOffsetX;
    const infoLabelDateOffsetX = infoLabelDate ? (infoLabelOffsetX + (infoLabelScales.x / 2 / infoLabelTransformerScales.x) - (infoLabelDateScales.x/2) - dateGapX) : null;
    switch(thisBot.tags.labelPositioning)
    {
        default:
        case LabelPositioning.LeftSided: {
            infoLabelOffsetX = -(radialVector.length() + infoLabelOffsetMargin + (infoLabelScales.x/2) + infoLabelTailScales.x);
            infoLabelTailOffsetX = infoLabelOffsetX + (infoLabelScales.x / 2 / infoLabelTransformerScales.x) + (infoLabelTailScales.x/2)
        }
        break;
        case LabelPositioning.RightSided: {
            infoLabelOffsetX = radialVector.length() + infoLabelOffsetMargin + (infoLabelScales.x/2) + infoLabelTailScales.x;
            infoLabelTailOffsetX = infoLabelOffsetX - (infoLabelScales.x / 2 / infoLabelTransformerScales.x) - (infoLabelTailScales.x/2);
        }
        break;
        case LabelPositioning.RightSidedCorner:{
            infoLabelOffsetX = radialVector.length() + (infoLabelScales.x/2);
            infoLabelTailOffsetX = infoLabelOffsetX - (infoLabelScales.x / 2 / infoLabelTransformerScales.x) + (infoLabelTailScales.x);
        }
        break;
    }
    setTagMask(infoLabel, dimension + 'X', infoLabelOffsetX);
    setTagMask(infoLabelTail, dimension + 'X', infoLabelTailOffsetX);
    infoLabelDate ? setTagMask(infoLabelDate, dimension + "X", infoLabelDateOffsetX) : null;
}