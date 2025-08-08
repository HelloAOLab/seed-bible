const jarvis = getBot('system', 'experience.jarvis');

const changeLightMode = async ({ parameters }) => {
    if (parameters.mode === "light") {
        const jarvisInstance = getBot('jarvis');
        setTagMask(jarvisInstance, "color", "white", "tempLocal")
        toggleDisplay(false);
        await animateTag(jarvisInstance, {
            fromValue: {
                scale: 1.1
            },
            toValue: {
                scale: 1000
            },
            duration: 1,
            easing: "in"
        })
        await animateTag(jarvisInstance, {
            fromValue: {
                scale: 1000
            },
            toValue: {
                scale: 1.1
            },
            duration: 1,
            easing: "out"
        })
        jarvisInstance.masks.color = null;
    } else if (parameters.mode === "dark") {
        const jarvisInstance = getBot('jarvis');
        setTagMask(jarvisInstance, "color", "black", "tempLocal")
        toggleDisplay(true);
        await animateTag(jarvisInstance, {
            fromValue: {
                scale: 1.1
            },
            toValue: {
                scale: 1000
            },
            duration: 1,
            easing: "in"
        })
        await animateTag(jarvisInstance, {
            fromValue: {
                scale: 1000
            },
            toValue: {
                scale: 1.1
            },
            duration: 1,
            easing: "out"
        })
        jarvisInstance.masks.color = null;
    }
    return {
        success: true,
        error: false
    }
}

const createImage = async ({ parameters }) => {
    const dim = os.getCurrentDimension();
    const typingTool = getBot(byTag("typingTool"));
    const aiMessage = await globalThis.aiUtils.callGPTImageGen(parameters.userRequirements);
    const controlBot = whisper(typingTool, "makeTextBox", {
        x: 0, y: 0, label: "", config: {
            formAddress: aiMessage
        }
    })[0].bot;
    const aiChat = getBot('system', 'ext_canvas.aiChat');
    setTagMask(controlBot, "formAddress", aiMessage, "shared");
    setTagMask(controlBot, "scaleX", aiChat.masks.width ? aiChat.masks.width * 0.01 : 500 * 0.01, "shared");
    setTagMask(controlBot, "scaleY", aiChat.masks.height ? aiChat.masks.height * 0.01 : 500 * 0.01, "shared");
    setTagMask(controlBot, "scaleY", aiChat.masks.height ? aiChat.masks.height * 0.01 : 500 * 0.01, "shared");
    setTag(controlBot, "prevScaleX", aiChat.masks.width ? aiChat.masks.width * 0.01 : 500 * 0.01)
    setTag(controlBot, "anchorPoint", aiChat.masks.anchorPoint ? aiChat.masks.anchorPoint : "center")
    setTagMask(controlBot, "formOpacity", 1, "shared");
    setTagMask(controlBot, "label", " ", "shared");
    setTagMask(controlBot, "onPointerEnter", " ", "shared");
    setTagMask(controlBot, "onPointerExit", " ", "shared");
    setTagMask(controlBot, "onClick", `@
        let typingManager = getBot(byTag("mmTypingManager"));
        // whisper(typingManager, "handleEnlargement", {bot: thisBot});
        let canvasTool = getBot('system', 'ext_canvas.canvasTool');
        if(canvasTool.masks?.type?.type === "annotation"){
            // whisper(canvasTool, "onGridClick", {botId: thisBot.tags.id})
            if(!globalThis?.annotInitialized){
                whisper(getBot('system', 'experience.annotation'), "initialize", {botId: thisBot.tags.id})
            }else{
                if(!annotBotIds.includes(thisBot.tags.id)){
                    setAnnotBotIds([...annotBotIds, thisBot.tags.id]);
                }
            }
        }
    `, "shared");
    animateTag(controlBot, {
        fromValue: {
            [dim + "RotationX"]: 0,
            [dim + "RotationY"]: 0,
            [dim + "RotationZ"]: 0,
        },
        toValue: {
            [dim + "RotationX"]: aiChat.masks?.rotationX ? Math.PI * 2 * aiChat.masks.rotationX : 0,
            [dim + "RotationY"]: aiChat.masks?.rotationY ? Math.PI * 2 * aiChat.masks.rotationY : 0,
            [dim + "RotationZ"]: aiChat.masks?.rotationZ ? Math.PI * 2 * aiChat.masks.rotationZ : 0,
        },
        duration: 0.1,
        easing: "elastic",
        tagMaskSpace: "local"
    })
    const typingManager = getBot(byTag("mmTypingManager"));
    whisper(typingManager, "onGridClick");
    return {
        success: true,
        error: false
    }
}

const createBibleStack = async ({ parameters }) => {
    StacksManager.SetStackCreationActive({ value: !StacksManager.masks.isBibleCreationActive });
    shout('TryCreateNewBible', {
        position: { x: 0, y: 0 },
        dimension: os.getCurrentDimension(),
        modality: "mouse",
        buttonId: "left"
    });
    return {
        success: true,
        error: false
    }
}

const spawnTestament = async ({ parameters }) => {
    const testament = parameters.testament;

    StacksManager.SpawnTestament({ name: testament });
    return {
        success: true,
        error: false
    }
}

const spawnSection = async ({ parameters }) => {
    const section = parameters.section;

    StacksManager.SpawnSection({ name: section });
    return {
        success: true,
        error: false
    }
}

const spawnBook = async ({ parameters }) => {

    const bookName = parameters.bookName;

    StacksManager.SpawnBook({ name: bookName });
    return {
        success: true,
        error: false
    }
}

const spawnChapter = async ({ parameters }) => {

    const bookName = parameters.bookName;
    const chapterNumber = parameters.chapterNumber;
    const success = await StacksManager.SpawnChapter({ bookName: bookName, chapterNumber: chapterNumber });
    if (!success) {
        return {
            message: "Chapter not found",
            success: false,
            error: true
        }
    }
    return {
        success: true,
        error: false
    }
}

// const pickBook = async ({ parameters }) => {

//     let bookName = parameters.bookName;

//     StacksManager.SpawnBook({ name: bookName });
//     return {
//         success: true,
//         error: false
//     }
// }

const pickChapter = async ({ parameters }) => {

    const bookName = parameters.bookName;
    const chapterNumber = parameters.chapterNumber;
    const success = await StacksManager.TryEjectChapter({ bookName: bookName, chapterNumber: chapterNumber });
    if (!success) {
        return {
            message: "Chapter not found",
            success: false,
            error: true
        }
    }
    return {
        success: true,
        error: false
    }
}

const pickChapterWithoutBookName = async ({ parameters }) => {
    const chapterNumber = parameters.chapterNumber;
    if (StacksManager.vars.lastInteractedBookData) {
        const numberOfChapters = StacksManager.GetNumberOfChaptersByName({ name: StacksManager.vars.lastInteractedBookData.elementInfo.commonName });
        if (chapterNumber <= numberOfChapters) {
            const success = await StacksManager.TryEjectChapter({ bookName: StacksManager.vars.lastInteractedBookData.elementInfo.commonName, chapterNumber });
            if (!success) {
                return {
                    message: "Chapter not found",
                    success: false,
                    error: true
                }
            }
            return {
                success: true,
                error: false
            }
        } else {
            return {
                message: "Chapter not found",
                success: false,
                error: true
            }
        }
    } else {
        return {
            message: "User hasn't interacted with any book yet",
            success: false,
            error: true
        }
    }
}

const createAnimation = async ({ parameters }) => {

    destroy(getBots("animationName", "aiAnimation"))
    const dim = os.getCurrentDimension();
    const config = {
    }
    config[dim] = true;
    config[dim + "X"] = 0;
    config[dim + "Y"] = 0;
    config[dim + "Z"] = 0;
    config[dim + "RotationX"] = 0;
    config[dim + "RotationY"] = 0;
    config[dim + "RotationZ"] = 0;
    config.scaleX = parameters.x;
    config.scaleY = parameters.y;
    config.scaleZ = parameters.z;
    config.animationFrames = parameters.animationFrame;

    const newAniBot = create({
        ...config,
        space: "tempLocal",
        toErase: true,
        animationName: "aiAnimation",
        onDestroy: `@
            getBots("animationName", thisBot.tags.animationName).forEach(item => {
                if(item && item.id !== thisBot.id){
                    destroy(item);
                }
            });
        `,
        onClick: `@
            shout("playAnimations", {animationName: thisBot.tags.animationName})
        `,
    });

    for (let k = 0; k < config.animationFrames.length; k++) {
        if (config.animationFrames[k].type === "recording") {
            const frameData = JSON.parse(config.animationFrames[k].frameData);
            for (let j = 0; j < frameData.states.length; j++) {
                frameData.states[j].tags[dim + "X"] = frameData.states[j].tags.dimX;
                frameData.states[j].tags[dim + "Y"] = frameData.states[j].tags.dimY;
                frameData.states[j].id = newAniBot.tags.id;
                delete (frameData.states[j].tags.dimX);
                delete (frameData.states[j].tags.dimY);
            }
            config.animationFrames[k].frameData = JSON.stringify(frameData);
        }
        config.animationFrames[k].initPos.x =''
        config.animationFrames[k].initPos.y = ''
    }

    newAniBot.tags.animationFrames = [...config.animationFrames]

    whisper(getBot('system', 'ext_canvas.eventTool'), "playAnimations", { animationName: 'aiAnimation' });
    return {
        success: true,
        error: false
    }
}

const clearCanvas = async ({ parameters }) => {
    const dim = os.getCurrentDimension();
    const clearBots = getBots(byMod({ toErase: true, [dim]: true }));
    for (const clearBot of clearBots) {
        destroy(clearBot);
        await os.sleep(20);
    }
    shout('ClearStacks')
    return {
        success: true,
        error: false
    }
}

const navigateToLobby = async ({ parameters }) => {
    getBot('system', 'experience.lobby').masks.lobbyInitiated = null;
    if (globalThis?.setSliderDimension) {
        setSliderDimension("lobby");
        setSliderDimensionNum(1);
    } else {
        const uiBot = getBot('system', 'main.UI');
        setTagMask(uiBot, "currentDimension", 'lobby', "local")
        setTagMask(uiBot, "currentDimensionNum", 1, "local")
    }

    os.goToURL(`https://ao.bot/?owner=public&inst=${os.getCurrentInst()}&gridPortal=lobby_1`);
    return {
        success: true,
        error: false
    }
}

const locatePlace = async ({ parameters }) => {
    const locationName = parameters.locationName;
    const allPlaces = [...Object.values(getBot('system', 'ext_canvas.sideBar').tags["places-new"])];
    const foundLocations = allPlaces.filter(place => {
        return place.place.toLowerCase().includes(locationName.toLowerCase());
    });
    if (foundLocations.length > 0) {
        shout("handleGeoJsonSearch", { place: foundLocations[0] });
    } else {
        // whisper(jarvis, 'handleVoice', { msg: "Sorry, but the location you have mentioned is not present in our bible location database" })
        return {
            message: "Sorry, but the location you have mentioned is not present in our bible location database",
            success: false,
            error: true
        }
    }
    return {
        success: true,
        error: false
    }
}

const closeMap = async ({ parameters }) => {
    setBibleLocationInit(false);
    setOpenSidebar(false);
    setCurrentExperience(0);
    shout("closeMiniMapPortal");
    return {
        success: true,
        error: false
    }
}

const loadChaism = async ({ parameters }) => {
    setOpenSidebar(false);
    setCurrentExperience(1);
    getBot('system', 'ext_canvas.chaismTool').createTool()
    return {
        success: true,
        error: false
    }
}

const closeChaism = async ({ parameters }) => {
    destroy(getBots("tray"));
    destroy(getBots("tray2"));
    destroy(getBots("wordBot"));
    await os.focusOn({ x: 0, y: 0 }, {
        duration: 1,
        rotation: { x: 1.01229, y: 0.5 },
        zoomValue: 7
    })
    gridPortalBot.masks.portalZoomableMax = null;
    gridPortalBot.masks.portalZoomableMin = null;
    gridPortalBot.tags.portalPannable = true;
    gridPortalBot.masks.portalPannable = true;
    gridPortalBot.masks.portalZoomable = true;
    gridPortalBot.tags.portalZoomable = true;
    await os.unregisterApp('chaismTool');
    return {
        success: true,
        error: false
    }
}

const openPage = async () => {
    shout("runThePage")

    return {
        success: true,
        error: false
    }
}

const closePage = async () => {
    shout("closeThePage")
    return {
        success: true,
        error: false
    }
}

const openBook = async ({ parameters }) => {
    os.log('needed', `${parameters.bookName.toLowerCase()} ${parameters.chapterNumber}:0`, parameters)
    OpenBibleAt(`${parameters.bookName.toLowerCase()} ${parameters.chapterNumber}:0`)
    return {
        success: true,
        error: false
    }
}
const createNewTab = async () => {
    os.log('creating new tab!')
    CreateNewTab()
    return {
        success: true,
        error: false
    }
}
const createAiTab = async ({ parameters }) => {
    os.log('creating new ai tab!', parameters)
    CreateAiTab(parameters?.data)
    return {
        success: true,
        error: false
    }
}

const launchHouseChurch = async () => {
    shout("ShowHouseChurchExperience");
    return {
        success: true,
        error: false
    }
}

const showSermonNetwork = async () => {
    const houseChurchManager = getBot('system', 'houseChurch.manager')
    const receiverHouses = getBots("system").filter((bot) => { return bot.tags.system.includes("houseChurch.house") && bot.id !== houseChurchManager.links.houseOne.id && bot.masks.activated })
    houseChurchManager.DisplayShareDataAnimation({ senderHouse: houseChurchManager.links.houseOne, receiverHouses });
    return {
        success: true,
        error: false
    }
}

const showHouseChurchStats = async () => {
    if(globalThis?.setShowStats){
        globalThis.setShowStats(true);
        return {
            success: true,
            error: false
        }
    }
    return {
        success: false,
        error: true,
        message: "stats unavailable for now"
    }
}

const hideHouseChurchStats = async () => {
    if(globalThis?.setShowStats){
        globalThis.setShowStats(false);
        return {
            success: true,
            error: false
        }
    }
    return {
        success: false,
        error: true,
        message: "stats unavailable for now"
    }
}

const StartCutscene = async () => {
    const houseChurchManager = getBot('system', 'houseChurch.manager')
    if (houseChurchManager.masks.assetsPreloaded) {
        houseChurchManager.StartCutscene()
        return {
            success: true,
            error: false
        }
    };
    return {
        message: "assets not loaded yet",
        success: false,
        error: true
    }
}

const closeHouseChurch = async () => {
    const houseChurchManager = getBot('system', 'houseChurch.manager')
    if (houseChurchManager.masks.initialized) {
        shout("CloseHouseChurchExperience");
        return {
            success: true,
            error: false
        }
    } else {
        return {
            message: "house church not loaded yet",
            success: false,
            error: true
        }
    }
}

globalThis.assistantActions = {
    changeLightMode,
    createImage,
    createBibleStack,
    createAiTab,
    createAnimation,
    clearCanvas,
    navigateToLobby,
    createNewTab,
    pickChapter,
    locatePlace,
    closeMap,
    spawnTestament,
    spawnSection,
    spawnBook,
    spawnChapter,
    pickChapterWithoutBookName,
    loadChaism,
    closeChaism,
    openPage,
    openBook,
    closePage,
    launchHouseChurch,
    showSermonNetwork,
    showHouseChurchStats,
    hideHouseChurchStats,
    StartCutscene,
    closeHouseChurch
}