const {element}  = that;
const currUsersColor = thisBot.GetCurrentUsersColorForElement({element});
const dimension = os.getCurrentDimension();
currUsersColor.forEach((userColor) => {
    let offset;
    let elementPosition;
    let elementScales;
    let step;
    let colorPosition;
    switch(element.tags.poolTag)
    {
        case BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer: {
            offset = BibleVizUtils.Data.tags.UsersColorValues.InfoLabelColorOffset;
            step = BibleVizUtils.Data.tags.UsersColorValues.InfoLabelColorStep;
            const {infoLabel} = element.GetLabelElements()
            elementPosition = infoLabel.tags.initialPosition
            elementScales = thisBot.GetBotScales(infoLabel)
            colorPosition = new Vector3(
                elementPosition.x - (elementScales.x/2) + (BibleVizUtils.Data.tags.UsersColorValues.InfoLabelColorScales.x/2) + offset.x + (userColor.tags.selectionIndex * step.x),
                elementPosition.y + (elementScales.y/2),
                elementPosition.z + elementScales.z + offset.z + (userColor.tags.selectionIndex * step.z) + (userColor.tags.isExtraUsersContent ? step.z : 0)
            )
        }
        break;
        case BibleVizUtils.Data.tags.ObjectPoolTags.Chapter:
        case BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapter:
            offset = BibleVizUtils.Data.tags.UsersColorValues.ChapterColorOffset;
            step = BibleVizUtils.Data.tags.UsersColorValues.ChapterColorStep;
            elementPosition = getBotPosition(element, dimension);
            elementScales = thisBot.GetBotScales(element)
            colorPosition = new Vector3(
                elementPosition.x - (elementScales.x/2) + (BibleVizUtils.Data.tags.UsersColorValues.GroundedElementColorScales.x/2) + offset.x + (userColor.tags.selectionIndex * step.x),
                elementPosition.y + (elementScales.y/2) - (BibleVizUtils.Data.tags.UsersColorValues.GroundedElementColorScales.y/2) - offset.y,
                elementPosition.z + elementScales.z - (userColor.tags.scaleZ/2) 
            )
        break
        case BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBook:
            offset = BibleVizUtils.Data.tags.UsersColorValues.MapBookColorOffset;
            step = BibleVizUtils.Data.tags.UsersColorValues.MapBookColorStep;
            elementPosition = getBotPosition(element, dimension);
            elementScales = thisBot.GetBotScales(element)
            colorPosition = new Vector3(
                elementPosition.x - (elementScales.x/2) + (BibleVizUtils.Data.tags.UsersColorValues.GroundedElementColorScales.x/2) + offset.x + (userColor.tags.selectionIndex * step.x),
                elementPosition.y + (elementScales.y/2) - (BibleVizUtils.Data.tags.UsersColorValues.GroundedElementColorScales.y/2) - offset.y,
                elementPosition.z + elementScales.z - (userColor.tags.scaleZ/2) 
            )
        break
    }
    setTag(userColor, dimension + "X", colorPosition.x)
    setTag(userColor, dimension + "Y", colorPosition.y)
    setTag(userColor, dimension + "Z", colorPosition.z)
    setTag(userColor, "initialPosition", colorPosition)
})
