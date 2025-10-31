const {element, elements} = that;
const dimension = os.getCurrentDimension();
const fixedElements = (Array.isArray(elements) ? elements : [element]).filter((currElement) => {return currElement.tags[dimension] == true});
const allUsersColor = [];
const myLobbyId = getBot('lobbyUserBot', true)?.id;
const maxAmountOfColors = 4;
fixedElements.forEach((fixedElement) => {
    const currUsersColor = thisBot.GetCurrentUsersColorForElement({element: fixedElement});
    const elementSelections;
    let selectionsElement;
    let userColorScales;
    let extraUsersContentScales;
    let extraUsersBackgroundScales;
    let userColorForm;
    let elementData;
    switch(fixedElement.tags.poolTag)
    {
        case ObjectPoolTags.InfoLabelTransformer:
            selectionsElement = fixedElement.links.ownerBot
            userColorScales = UsersColorValues.InfoLabelColorScales;
            extraUsersContentScales = UsersColorValues.InfoLabelExtraUsersContentScales;
            extraUsersBackgroundScales = UsersColorValues.InfoLabelExtraUsersBackgroundScales;
            userColorForm = UsersColorValues.InfoLabelColorForm
        break;
        case ObjectPoolTags.Chapter:
        case ObjectPoolTags.MapBook:
        case ObjectPoolTags.MapChapter:
            elementData = fixedElement.tags.poolTag == ObjectPoolTags.Chapter ? StacksManager.GetBibleElementData({element: fixedElement}) :
                MapsManager.GetMapElementData({element: fixedElement})
            selectionsElement = fixedElement;
            userColorScales = UsersColorValues.GroundedElementColorScales;
            extraUsersContentScales = UsersColorValues.GroundedElementExtraUsersContentScales;
            extraUsersBackgroundScales = UsersColorValues.GroundedElementExtraUsersBackgroundScales;
            userColorForm = UsersColorValues.GroundedElementColorForm;
        break;
    }
    elementSelections = thisBot.GetUsersSelectionForElement({element: selectionsElement})
    const fixedSelections = elementSelections.filter((selection) => {return selection.userId != getID(configBot)})
    if(fixedSelections.length > 0)
    {
        for(let i = 0; i < maxAmountOfColors; i++)
        {
            const userColorAtIndex = currUsersColor.find((currUserColor) => {return currUserColor.tags.selectionIndex == i})
            if(userColorAtIndex && (i >= fixedSelections.length))
            {
                ObjectPooler.ReleaseObject({obj: userColorAtIndex, tag: userColorAtIndex.tags.poolTag});
            }
        }
        if(fixedSelections.length <= maxAmountOfColors)
        {
            const currExtraUsersContent = currUsersColor.find((currUserColor) => {return currUserColor.tags.isExtraUsersContent});
            const currExtraUsersBackground = currUsersColor.find((currUserColor) => {return currUserColor.tags.isExtraUsersBackground});
            if(currExtraUsersContent) ObjectPooler.ReleaseObject({obj: currExtraUsersContent, tag: currExtraUsersContent.tags.poolTag});
            if(currExtraUsersBackground) ObjectPooler.ReleaseObject({obj: currExtraUsersBackground, tag: currExtraUsersBackground.tags.poolTag});            
        }
        for(const selectionIndex in fixedSelections)
        {
            const userSelection = fixedSelections[selectionIndex];
            if(selectionIndex >= maxAmountOfColors)
            {
                const extraUsers = fixedSelections.length - maxAmountOfColors;
                const label = `+${extraUsers}`;
                let extraUsersContent = getBot(
                    byTag('isExtraUsersContent', true), 
                    byTag("isUserColor", true), 
                    fixedElement.tags.isInfoLabelTransformer ? byTag("transformer", getID(fixedElement)) : byTag("ownerDataId", Number(elementData.id)), 
                    byTag('isInUse', true)
                )
                let extraUsersBackground = getBot(
                    byTag('isExtraUsersBackground', true), 
                    byTag("isUserColor", true), 
                    fixedElement.tags.isInfoLabelTransformer ? byTag("transformer", getID(fixedElement)) : byTag("ownerDataId", Number(elementData.id)), 
                    byTag('isInUse', true)
                )

                if(extraUsersContent)
                {
                    setTag(extraUsersContent, "label", label);
                }
                else
                {
                    extraUsersBackground = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.UserColor})
                    extraUsersContent = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.UserColor})
                    
                    const backgroundMod = {
                        color: "black",
                        [dimension]: true,
                        isExtraUsersBackground: true,
                        transformer: fixedElement.tags.poolTag == ObjectPoolTags.InfoLabelTransformer ? getID(fixedElement) : null,
                        ownerBotId: fixedElement.tags.poolTag == ObjectPoolTags.InfoLabelTransformer ? getID(fixedElement.links.ownerBot) : null,
                        ownerDataId: fixedElement.tags.poolTag != ObjectPoolTags.InfoLabelTransformer ? elementData.id : null,
                        selectionIndex,
                        scaleX: extraUsersBackgroundScales.x,
                        scaleY: extraUsersBackgroundScales.y,
                        scaleZ: extraUsersBackgroundScales.z,
                        form: userColorForm
                    }
                    const contentMod = {
                        color: "white",
                        [dimension]: true,
                        isExtraUsersContent: true,
                        transformer: fixedElement.tags.poolTag == ObjectPoolTags.InfoLabelTransformer ? getID(fixedElement) : null,
                        ownerBotId: fixedElement.tags.poolTag == ObjectPoolTags.InfoLabelTransformer ? getID(fixedElement.links.ownerBot) : null,
                        ownerDataId: fixedElement.tags.poolTag != ObjectPoolTags.InfoLabelTransformer ? elementData.id : null,
                        selectionIndex,
                        label,
                        scaleX: extraUsersContentScales.x,
                        scaleY: extraUsersContentScales.y,
                        scaleZ: extraUsersContentScales.z,
                        form: userColorForm
                    }
                    extraUsersBackground.OnSpawned({mod: backgroundMod});
                    extraUsersContent.OnSpawned({mod: contentMod});
                }
                allUsersColor.push(extraUsersBackground, extraUsersContent);
                break;
            }
            else
            {
                const color = links.lobby?.masks?.users?.slice()
                    .find((userInfo) => {
                        return userInfo.instanceId == userSelection.userId && userInfo.instanceId != getID(configBot)
                    })?.color ?? "#808080";
                
                let userColor = getBot(
                    byTag("isUserColor", true), 
                    fixedElement.tags.isInfoLabelTransformer ? byTag("transformer", getID(fixedElement)) : byTag("ownerDataId", elementData.id), 
                    byTag('isInUse', true), 
                    byTag('selectionIndex', Number(selectionIndex))
                );
                if(userColor)
                {
                    setTag(userColor, 'color', color);
                }
                else
                {
                    userColor = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.UserColor})
                    const userColorMod = {
                        color,
                        selectionIndex,
                        [dimension]: true,
                        transformer: fixedElement.tags.poolTag == ObjectPoolTags.InfoLabelTransformer ? getID(fixedElement) : null,
                        ownerBotId: fixedElement.tags.poolTag == ObjectPoolTags.InfoLabelTransformer ? getID(fixedElement.links.ownerBot) : null,
                        ownerDataId: fixedElement.tags.poolTag != ObjectPoolTags.InfoLabelTransformer ? elementData.id : null,
                        scaleX: userColorScales.x,
                        scaleY: userColorScales.y,
                        scaleZ: userColorScales.z,
                        form: userColorForm
                    }
                    userColor.OnSpawned({mod: userColorMod})
                }
                allUsersColor.push(userColor);
            }
        }
    }
    else currUsersColor.forEach((userColor) => {ObjectPooler.ReleaseObject({obj: userColor, tag: userColor.tags.poolTag});})

    thisBot.SetUsersColorPositionOnElement({element: fixedElement})
})

return allUsersColor;