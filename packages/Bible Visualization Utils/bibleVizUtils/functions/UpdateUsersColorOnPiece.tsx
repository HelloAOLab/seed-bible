if(!thisBot.vars.tabsContext) return [];

const {piece, pieces, manager, source = "Unknown"} = that;
const dimension = os.getCurrentDimension();
const fixedPieces = (Array.isArray(pieces) ? pieces : [piece]).filter((currElement) => {return currElement.tags[dimension] == true});
const allUsersColor = [];
const maxAmountOfColors = 4;

for(const fixedPiece of fixedPieces)
{
    const currUsersColor = thisBot.GetCurrentUsersColorForPiece({piece: fixedPiece});
    let selectionsPiece;
    let userColorScales;
    let extraUsersContentScales;
    let extraUsersBackgroundScales;
    let userColorForm;
    let pieceData;
    switch(fixedPiece.tags.poolTag)
    {
        case BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer:
            selectionsPiece = fixedPiece.links.ownerBot
            userColorScales = BibleVizUtils.Data.tags.UsersColorValues.InfoLabelColorScales;
            extraUsersContentScales = BibleVizUtils.Data.tags.UsersColorValues.InfoLabelExtraUsersContentScales;
            extraUsersBackgroundScales = BibleVizUtils.Data.tags.UsersColorValues.InfoLabelExtraUsersBackgroundScales;
            userColorForm = BibleVizUtils.Data.tags.UsersColorValues.InfoLabelColorForm;
        break;
        case BibleVizUtils.Data.tags.ObjectPoolTags.StackChapter:
        case BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBook:
        case BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapter:
            pieceData = fixedPiece.tags.poolTag == BibleVizUtils.Data.tags.ObjectPoolTags.StackChapter ? BibleStackManager.GetPieceData({piece: fixedPiece}) :
                ScriptureMap3DManager.GetPieceData({piece: fixedPiece})
            selectionsPiece = fixedPiece;
            userColorScales = BibleVizUtils.Data.tags.UsersColorValues.GroundedElementColorScales;
            extraUsersContentScales = BibleVizUtils.Data.tags.UsersColorValues.GroundedElementExtraUsersContentScales;
            extraUsersBackgroundScales = BibleVizUtils.Data.tags.UsersColorValues.GroundedElementExtraUsersBackgroundScales;
            userColorForm = BibleVizUtils.Data.tags.UsersColorValues.GroundedElementColorForm;
        break;
    }

    const pieceActivity = thisBot.GetActivityForPiece({piece: selectionsPiece, tabsContext: manager.vars.tabsContext})

    if(selectionsPiece.tags.typeOfPiece === BibleVizUtils.Data.tags.BiblePieceType.StackSectionShadow) console.log(`[Debug] UpdateUsersColorOnPiece`, {source, pieceActivity, piece: {...selectionsPiece}});
    
    if(pieceActivity.length > 0)
    {
        for(let i = 0; i < maxAmountOfColors; i++)
        {
            const userColorAtIndex = currUsersColor.find((currUserColor) => {return currUserColor.tags.activityIndex == i})
            if(userColorAtIndex && (i >= pieceActivity.length))
            {
                ObjectPooler.ReleaseObject({obj: userColorAtIndex, tag: userColorAtIndex.tags.poolTag});
            }
        }
        if(pieceActivity.length <= maxAmountOfColors)
        {
            const currExtraUsersContent = currUsersColor.find((currUserColor) => {return currUserColor.tags.isExtraUsersContent});
            const currExtraUsersBackground = currUsersColor.find((currUserColor) => {return currUserColor.tags.isExtraUsersBackground});
            if(currExtraUsersContent) ObjectPooler.ReleaseObject({obj: currExtraUsersContent, tag: currExtraUsersContent.tags.poolTag});
            if(currExtraUsersBackground) ObjectPooler.ReleaseObject({obj: currExtraUsersBackground, tag: currExtraUsersBackground.tags.poolTag});            
        }
        for(const activityIndex in pieceActivity)
        {
            const activity = pieceActivity[activityIndex];
            if(activityIndex >= maxAmountOfColors)
            {
                const extraUsers = pieceActivity.length - maxAmountOfColors;
                const label = `+${extraUsers}`;
                let extraUsersContent = getBot(
                    byTag('isExtraUsersContent', true), 
                    byTag("isUserColor", true), 
                    fixedPiece.tags.isInfoLabelTransformer ? byTag("transformer", getID(fixedPiece)) : byTag("ownerDataId", Number(pieceData.id)), 
                    byTag('isInUse', true)
                )
                let extraUsersBackground = getBot(
                    byTag('isExtraUsersBackground', true), 
                    byTag("isUserColor", true), 
                    fixedPiece.tags.isInfoLabelTransformer ? byTag("transformer", getID(fixedPiece)) : byTag("ownerDataId", Number(pieceData.id)), 
                    byTag('isInUse', true)
                )

                if(extraUsersContent)
                {
                    setTag(extraUsersContent, "label", label);
                }
                else
                {
                    extraUsersBackground = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.UserColor})
                    extraUsersContent = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.UserColor})
                    
                    const backgroundMod = {
                        color: "black",
                        [dimension]: true,
                        isExtraUsersBackground: true,
                        transformer: fixedPiece.tags.poolTag == BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer ? getID(fixedPiece) : null,
                        ownerBotId: fixedPiece.tags.poolTag == BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer ? getID(fixedPiece.links.ownerBot) : null,
                        ownerDataId: fixedPiece.tags.poolTag != BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer ? pieceData.id : null,
                        activityIndex,
                        scaleX: extraUsersBackgroundScales.x,
                        scaleY: extraUsersBackgroundScales.y,
                        scaleZ: extraUsersBackgroundScales.z,
                        targetOpacity: 1,
                        formOpacity: 1,
                        form: userColorForm,
                    }
                    const contentMod = {
                        color: "white",
                        [dimension]: true,
                        isExtraUsersContent: true,
                        transformer: fixedPiece.tags.poolTag == BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer ? getID(fixedPiece) : null,
                        ownerBotId: fixedPiece.tags.poolTag == BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer ? getID(fixedPiece.links.ownerBot) : null,
                        ownerDataId: fixedPiece.tags.poolTag != BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer ? pieceData.id : null,
                        activityIndex,
                        label,
                        scaleX: extraUsersContentScales.x,
                        scaleY: extraUsersContentScales.y,
                        scaleZ: extraUsersContentScales.z,
                        targetOpacity: 1,
                        formOpacity: 1,
                        form: userColorForm,
                    }
                    extraUsersBackground.OnSpawned({mod: backgroundMod});
                    extraUsersContent.OnSpawned({mod: contentMod});
                }
                allUsersColor.push(extraUsersBackground, extraUsersContent);
                break;
            }
            else
            {
                const isActiveTab = activity.id === manager.vars.tabsContext.activeTab;
                const color = Object.keys(BibleVizUtils.Data.vars.userPresenceData ?? {}).find((key) => { return BibleVizUtils.Data.vars.userPresenceData[key].tab === activity})?.user?.color ?? BibleVizUtils.Data.tags.myUserColor;


                const opacity = isActiveTab ? 1 : 0.5;
                const formRenderOrder = isActiveTab ? -1 : 10 - Number(activityIndex)
                
                let userColor = getBot(
                    byTag("isUserColor", true), 
                    fixedPiece.tags.isInfoLabelTransformer ? byTag("transformer", getID(fixedPiece)) : byTag("ownerDataId", pieceData.id), 
                    byTag('isInUse', true), 
                    byTag('activityIndex', Number(activityIndex))
                );
                if(userColor)
                {
                    setTag(userColor, 'color', color);
                    setTagMask(userColor, "formOpacity", opacity);
                    setTag(userColor, "targetOpacity", opacity);
                    setTag(userColor, "formRenderOrder", formRenderOrder);
                }
                else
                {
                    userColor = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.UserColor})
                    const userColorMod = {
                        color,
                        activityIndex,
                        [dimension]: true,
                        transformer: fixedPiece.tags.poolTag == BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer ? getID(fixedPiece) : null,
                        ownerBotId: fixedPiece.tags.poolTag == BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer ? getID(fixedPiece.links.ownerBot) : null,
                        ownerDataId: fixedPiece.tags.poolTag != BibleVizUtils.Data.tags.ObjectPoolTags.InfoLabelTransformer ? pieceData.id : null,
                        scaleX: userColorScales.x,
                        scaleY: userColorScales.y,
                        scaleZ: userColorScales.z,
                        form: userColorForm,
                        formOpacity: opacity,
                        targetOpacity: opacity,
                        formRenderOrder
                    }
                    userColor.OnSpawned({mod: userColorMod})
                }
                allUsersColor.push(userColor);
            }
        }
    }
    else currUsersColor.forEach((userColor) => {ObjectPooler.ReleaseObject({obj: userColor, tag: userColor.tags.poolTag});})

    thisBot.SetUsersColorPositionOnPiece({piece: fixedPiece})
}

return allUsersColor;