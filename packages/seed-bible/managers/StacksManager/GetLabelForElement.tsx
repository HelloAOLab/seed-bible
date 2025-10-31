/**
    * Returns a label for the given stack element with the given text, color, label color.
    * @param {Object} that - Object that contains important data for the function
    * @param {Bot} that.element - The bot to which the label will belong
    * @param {String} that.label - The text that wild hold the label
    * @param {String} that.color - The desired color for the label and label tail
    * @param {String} that.labelColor - The desired color for the text on the label
    * @param {String} that.dimension - The dimension to set the label
    * @param {Bool} that.isAside - Determines if the label will be positioned on top or on the side of the element
    * @param {Bool} that.isAnimatable - Determines if the label will be able to make the shake animation while active
    * @example
    * StacksManager.GetLabelForElement({element: thisBot, label: someText, color: '#FFFFFF', labelColor: '#000000', dimension: 'home', isAside: true, isAnimatable: false});
*/

const {element, label, date, color, labelColor, dimension, labelPositioning, isAnimatable, targetOpacity = 1} = that;

const {scaleY} = GetDialogBotScaleY(5, label, 0.4, 0.4)
const infoLabelScales                       = {x: 5, y: scaleY, z: 1};
const infoLabelAspectRatio                  = infoLabelScales.x / infoLabelScales.y;
const closestFormAddressAspectRatio         = ClosestNumber(InstanceManager.tags.dialogBoxFormAddresses.map((formAddressesInfo) => {return formAddressesInfo.aspectRatio}), infoLabelAspectRatio)
const infoLabelFormAddress                  = InstanceManager.tags.dialogBoxFormAddresses.find((formAddressesInfo) => {return formAddressesInfo.aspectRatio === closestFormAddressAspectRatio}).formAddress;
const transformer                           = element.tags.transformer ? getBot(byID(element.tags.transformer)) : null;
const transformerOffset                     = 1;
const transformerPosition                   = transformer ? (getBotPosition(transformer, dimension).add(new Vector3(0, 0, transformerOffset))) : new Vector3(0, 0, 0);
const elementPosition                       = getBotPosition(element, dimension);
const elementScales                         = GetBotScales(element);
const infoLabelTransformer                  = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.InfoLabelTransformer});
const infoLabel                             = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.InfoLabel});
const infoLabelTail                         = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.InfoLabelTail});
const infoLabelDate                         = date ? ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.InfoLabelDate}) : null;
const infoLabelTransformerDesiredScales     = {x: 1, y: 1, z: 1};
const radialVector                          = new Vector2(elementScales.x/2, elementScales.y/2)
const infoLabelOffsetMargin                 = 0.25;
let infoLabelTailDesiredScales              = {x: 0.3 / infoLabelTransformerDesiredScales.x, y: 0.3 / infoLabelTransformerDesiredScales.y, z: 0.3 / infoLabelTransformerDesiredScales.z}
const infoLabelDateDesiredScales              = {x: 0.3 / infoLabelTransformerDesiredScales.x, y: 0.3 / infoLabelTransformerDesiredScales.y, z: 0.3 / infoLabelTransformerDesiredScales.z}
const dateGap                                 = {x: 0.2, y: 0.05};
const infoLabelDateScales                   = infoLabelDate ? GetBotScales(infoLabelDate) : null;
let infoLabelTransformerDesiredPosition;
let infoLabelOffset;
let infoLabelTailDesiredRotationZ;
let infoLabelTailOffset;
const infoLabelTransformerMod, infoLabelTailMod, infoLabelMod, infoLabelDateMod

switch(labelPositioning)
{
    default:
    case LabelPositioning.LeftSided: {
        infoLabelTransformerDesiredPosition = new Vector3(
            elementPosition.x, 
            elementPosition.y, 
            elementPosition.z + (elementScales.z / 2) - (infoLabelTransformerDesiredScales.z / 2)
        ).add(transformerPosition);
        infoLabelOffset = new Vector3(-(radialVector.length() + infoLabelOffsetMargin + (infoLabelScales.x/2) + infoLabelTailDesiredScales.x), 0.5, 5);
        infoLabelTailDesiredRotationZ = math.degreesToRadians(90);
        infoLabelTailOffset = new Vector3(
            infoLabelOffset.x + (infoLabelScales.x / 2 / infoLabelTransformerDesiredScales.x) + (infoLabelTailDesiredScales.x/2), 
            infoLabelOffset.y, 
            infoLabelOffset.z
        );
    }
    break;
    case LabelPositioning.RightSided: {
        infoLabelTransformerDesiredPosition = new Vector3(
            elementPosition.x, 
            elementPosition.y, 
            elementPosition.z + (elementScales.z / 2) - (infoLabelTransformerDesiredScales.z / 2)
        ).add(transformerPosition);
        infoLabelOffset = new Vector3(radialVector.length() + infoLabelOffsetMargin + (infoLabelScales.x/2) + infoLabelTailDesiredScales.x, 0.5, 5);
        infoLabelTailDesiredRotationZ = math.degreesToRadians(-90);
        infoLabelTailOffset = new Vector3(
            infoLabelOffset.x - (infoLabelScales.x / 2 / infoLabelTransformerDesiredScales.x) - (infoLabelTailDesiredScales.x/2), 
            infoLabelOffset.y,
            infoLabelOffset.z
        );
    }
    break;
    case LabelPositioning.Top: {
        const groundedElementLabelOffsetY = 1.5;
        infoLabelTransformerDesiredPosition = new Vector3(
            elementPosition.x, 
            elementPosition.y, 
            elementPosition.z + (elementScales.z) - (infoLabelTransformerDesiredScales.z / 2)
        ).add(transformerPosition);
        infoLabelOffset = new Vector3(0, groundedElementLabelOffsetY + (infoLabelScales.y/2), 5);
        infoLabelTailDesiredRotationZ = 0;
        infoLabelTailOffset = new Vector3(0, infoLabelOffset.y - (infoLabelScales.y/2) - (infoLabelTailDesiredScales.y/2), infoLabelOffset.z);
    }
    break;
    case LabelPositioning.RightSidedCorner:{
        infoLabelTransformerDesiredPosition = new Vector3(
            elementPosition.x, 
            elementPosition.y, 
            elementPosition.z + (elementScales.z) - (infoLabelTransformerDesiredScales.z / 2)  + 1.5
        ).add(transformerPosition);
        infoLabelTailDesiredScales = {x: 0.7 / infoLabelTransformerDesiredScales.x, y: 0.7 / infoLabelTransformerDesiredScales.y, z: 0.7 / infoLabelTransformerDesiredScales.z}
        infoLabelOffset = new Vector3(radialVector.length() + (infoLabelScales.x/2), 0.5, 5);
        infoLabelTailDesiredRotationZ = math.degreesToRadians(-26.56);
        infoLabelTailOffset = new Vector3(
            infoLabelOffset.x - (infoLabelScales.x / 2 / infoLabelTransformerDesiredScales.x) + (infoLabelTailDesiredScales.x), 
            infoLabelOffset.y - (infoLabelScales.y / 2 / infoLabelTransformerDesiredScales.y), 
            infoLabelOffset.z
        );
    }
    break;
}
const infoLabelDateOffset = infoLabelDate ? new Vector3(
    infoLabelOffset.x + (infoLabelScales.x / 2 / infoLabelTransformerDesiredScales.x) - ((InstanceManager.GetCurrentLabelDateFormat() === LabelDateFormats.Relative ? infoLabelDate.tags.relativeDateScales.x : infoLabelDate.tags.absoluteDateScales.x)/2) - dateGap.x, 
    infoLabelOffset.y + (infoLabelScales.y/2) + (infoLabelDateScales.y/2) + dateGap.y,
    infoLabelOffset.z
) : null;
infoLabelTransformerMod = {
    [dimension]: true,
    [dimension + "X"]: infoLabelTransformerDesiredPosition.x,
    [dimension + "Y"]: infoLabelTransformerDesiredPosition.y,
    [dimension + "Z"]: infoLabelTransformerDesiredPosition.z,
    scaleX: infoLabelTransformerDesiredScales.x,
    scaleY: infoLabelTransformerDesiredScales.y,
    scaleZ: infoLabelTransformerDesiredScales.z,
    ownerBotId: getID(element),
    ownerBot: `🔗${getID(element)}`,
    isAnimatable,
    labelPositioning,
    targetOpacity
}
infoLabelMod = {
    [dimension]: true,
    [dimension + "X"]: infoLabelOffset.x,
    [dimension + "Y"]: infoLabelOffset.y,
    [dimension + "Z"]: infoLabelOffset.z,
    initialPosition: infoLabelOffset,
    label,
    transformer: getID(infoLabelTransformer),
    scaleX: infoLabelScales.x / infoLabelTransformerDesiredScales.x,
    scaleY: infoLabelScales.y / infoLabelTransformerDesiredScales.y,
    scaleZ: infoLabelScales.z / infoLabelTransformerDesiredScales.z,
    formAddress: infoLabelFormAddress,
    pointable: false,
    formOpacity: 0,
    labelOpacity: 0,
    color,
    labelColor,
    labelPositioning,
    ownerBotId: getID(element)
};
infoLabelTailMod = {
    [dimension]: true,
    [dimension + "X"]: infoLabelTailOffset.x,
    [dimension + "Y"]: infoLabelTailOffset.y,
    [dimension + "Z"]: infoLabelTailOffset.z,
    initialPosition: infoLabelTailOffset,
    [dimension + "RotationZ"]: infoLabelTailDesiredRotationZ,
    transformer: getID(infoLabelTransformer),
    scaleX: infoLabelTailDesiredScales.x,
    scaleY: infoLabelTailDesiredScales.y,
    scaleZ: infoLabelTailDesiredScales.z,
    color,
    formOpacity: 0,
    labelPositioning,
    ownerBotId: getID(element)
};
infoLabelDateMod = infoLabelDate ? {
    [dimension]: true,
    [dimension + "X"]: infoLabelDateOffset.x,
    [dimension + "Y"]: infoLabelDateOffset.y,
    [dimension + "Z"]: infoLabelDateOffset.z,
    initialPosition: infoLabelDateOffset,
    transformer: getID(infoLabelTransformer),
    label: date,
    color,
    formAddress: InstanceManager.GetCurrentLabelDateFormat() === LabelDateFormats.Relative ? infoLabelDate.tags.relativeDateFormAddress : infoLabelDate.tags.absoluteDateFormAddress,
    scaleX: InstanceManager.GetCurrentLabelDateFormat() === LabelDateFormats.Relative ? infoLabelDate.tags.relativeDateScales.x : infoLabelDate.tags.absoluteDateScales.x,
    labelColor,
    formOpacity: 0,
    labelPositioning,
    ownerBotId: getID(element)
} : null;
infoLabelTransformer.OnSpawned({mod: infoLabelTransformerMod});
infoLabel.OnSpawned({mod: infoLabelMod});
infoLabelTail.OnSpawned({mod: infoLabelTailMod});
infoLabelDate?.OnSpawned({mod: infoLabelDateMod});

const infoLabelUsersColor = InstanceManager.UpdateUsersColorOnElement({element: infoLabelTransformer});

setTagMask([...infoLabelUsersColor, infoLabel], "formOpacity", 0);
setTagMask([infoLabel, infoLabelTail, infoLabelDate], "labelOpacity", 0);

return {infoLabelTransformer}