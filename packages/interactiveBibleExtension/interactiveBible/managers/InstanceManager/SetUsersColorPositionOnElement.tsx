const {element}  = that;
let currUsersColor = thisBot.GetCurrentUsersColorForElement({element});
const dimension = os.getCurrentDimension();
currUsersColor.forEach((userColor) => {
    let offset;
    let elementPosition;
    let elementScales;
    let step;
    let colorPosition;
    switch(element.tags.poolTag)
    {
        case ObjectPoolTags.InfoLabelTransformer: {
            offset = UsersColorValues.InfoLabelColorOffset;
            step = UsersColorValues.InfoLabelColorStep;
            const {infoLabel} = element.GetLabelElements()
            elementPosition = infoLabel.tags.initialPosition
            elementScales = GetBotScales(infoLabel)
            colorPosition = new Vector3(
                elementPosition.x - (elementScales.x/2) + (UsersColorValues.InfoLabelColorScales.x/2) + offset.x + (userColor.tags.selectionIndex * step.x),
                elementPosition.y + (elementScales.y/2),
                elementPosition.z + elementScales.z + offset.z + (userColor.tags.selectionIndex * step.z) + (userColor.tags.isExtraUsersContent ? step.z : 0)
            )
        }
        break;
        case ObjectPoolTags.Chapter:
        case ObjectPoolTags.MapChapter:
            offset = UsersColorValues.ChapterColorOffset;
            step = UsersColorValues.ChapterColorStep;
            elementPosition = getBotPosition(element, dimension);
            elementScales = GetBotScales(element)
            colorPosition = new Vector3(
                elementPosition.x - (elementScales.x/2) + (UsersColorValues.GroundedElementColorScales.x/2) + offset.x + (userColor.tags.selectionIndex * step.x),
                elementPosition.y + (elementScales.y/2) - (UsersColorValues.GroundedElementColorScales.y/2) - offset.y,
                elementPosition.z + elementScales.z - (userColor.tags.scaleZ/2) 
            )
        break
        case ObjectPoolTags.MapBook:
            offset = UsersColorValues.MapBookColorOffset;
            step = UsersColorValues.MapBookColorStep;
            elementPosition = getBotPosition(element, dimension);
            elementScales = GetBotScales(element)
            colorPosition = new Vector3(
                elementPosition.x - (elementScales.x/2) + (UsersColorValues.GroundedElementColorScales.x/2) + offset.x + (userColor.tags.selectionIndex * step.x),
                elementPosition.y + (elementScales.y/2) - (UsersColorValues.GroundedElementColorScales.y/2) - offset.y,
                elementPosition.z + elementScales.z - (userColor.tags.scaleZ/2) 
            )
        break
    }
    setTag(userColor, dimension + "X", colorPosition.x)
    setTag(userColor, dimension + "Y", colorPosition.y)
    setTag(userColor, dimension + "Z", colorPosition.z)
    setTag(userColor, "initialPosition", colorPosition)
})
