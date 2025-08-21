const {piece}  = that;
const currUsersColor = thisBot.GetCurrentUsersColorForElement({piece});
const dimension = os.getCurrentDimension();
currUsersColor.forEach((userColor) => {
    let offset;
    let piecePosition;
    let pieceScales;
    let step;
    let colorPosition;
    switch(piece.tags.poolTag)
    {
        case BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer: {
            offset = BibleVizUtils.Data.tags.UsersColorValues.InfoLabelColorOffset;
            step = BibleVizUtils.Data.tags.UsersColorValues.InfoLabelColorStep;
            const {infoLabel} = piece.GetLabelElements()
            piecePosition = infoLabel.tags.initialPosition
            pieceScales = thisBot.GetBotScales(infoLabel)
            colorPosition = new Vector3(
                piecePosition.x - (pieceScales.x/2) + (BibleVizUtils.Data.tags.UsersColorValues.InfoLabelColorScales.x/2) + offset.x + (userColor.tags.selectionIndex * step.x),
                piecePosition.y + (pieceScales.y/2),
                piecePosition.z + pieceScales.z + offset.z + (userColor.tags.selectionIndex * step.z) + (userColor.tags.isExtraUsersContent ? step.z : 0)
            )
        }
        break;
        case BibleVizUtils.Data.tags.ObjectPoolTags.Chapter:
        case BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapter:
            offset = BibleVizUtils.Data.tags.UsersColorValues.ChapterColorOffset;
            step = BibleVizUtils.Data.tags.UsersColorValues.ChapterColorStep;
            piecePosition = getBotPosition(piece, dimension);
            pieceScales = thisBot.GetBotScales(piece)
            colorPosition = new Vector3(
                piecePosition.x - (pieceScales.x/2) + (BibleVizUtils.Data.tags.UsersColorValues.GroundedElementColorScales.x/2) + offset.x + (userColor.tags.selectionIndex * step.x),
                piecePosition.y + (pieceScales.y/2) - (BibleVizUtils.Data.tags.UsersColorValues.GroundedElementColorScales.y/2) - offset.y,
                piecePosition.z + pieceScales.z - (userColor.tags.scaleZ/2) 
            )
        break
        case BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBook:
            offset = BibleVizUtils.Data.tags.UsersColorValues.MapBookColorOffset;
            step = BibleVizUtils.Data.tags.UsersColorValues.MapBookColorStep;
            piecePosition = getBotPosition(piece, dimension);
            pieceScales = thisBot.GetBotScales(piece)
            colorPosition = new Vector3(
                piecePosition.x - (pieceScales.x/2) + (BibleVizUtils.Data.tags.UsersColorValues.GroundedElementColorScales.x/2) + offset.x + (userColor.tags.selectionIndex * step.x),
                piecePosition.y + (pieceScales.y/2) - (BibleVizUtils.Data.tags.UsersColorValues.GroundedElementColorScales.y/2) - offset.y,
                piecePosition.z + pieceScales.z - (userColor.tags.scaleZ/2) 
            )
        break
    }
    setTag(userColor, dimension + "X", colorPosition.x)
    setTag(userColor, dimension + "Y", colorPosition.y)
    setTag(userColor, dimension + "Z", colorPosition.z)
    setTag(userColor, "initialPosition", colorPosition)
})
