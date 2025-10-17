if(!globalThis.hideSeekPlaying) return;
const mainWordUpperCover = getBot("isMainWordUpperCover", true);
const dimension = os.getCurrentDimension();

// Creating The Trophy
const createTrophies = getBots("isTrophy",true);


// if(thisBot.tags.isPlaceTrophyButton){
//     activeTrophy = createTrophies.find(trophy=>trophy.tags.isActive);
//     if(!activeTrophy) return os.toast("NO Trophy found!")
//     activeTrophy.onHide();
//     return;
// }

if(createTrophies.some(trophy=>trophy.tags.isPlaying)) return os.toast("Game in progress!")


if (!createTrophies.some(trophy=>trophy.tags.isActive)){

    const goalBookName = thisBot.tags.gameData.bookName;

    if(!goalBookName) return os.toast("Select a Book to create Game!");

    const goldenTrophy = createTrophies.find(trophy=>!trophy.tags.initialized);
    
    if(goldenTrophy) {
        // const trophy = create(goldenTrophy,{
        //     [dimension]: true,
        //     [dimension + "X"]: mainWordUpperCover.tags.homeX + 10,
        //     [dimension + "Y"]: mainWordUpperCover.tags.homeY - 5,
        //     [dimension + "Z"]: 0,
        //     space: "tempLocal",
        //     initialized: true,
        //     isActive: true,
        //     GAME_MODE: thisBot.tags.GAME_MODE
        // });

        setTag(goldenTrophy,"GAME_MODE",globalThis.GAME_MODES.HOTSEAT);

        whisper(goldenTrophy,"onHide",{hints: [], winMessage: that.winMessage , creatorName: that.creatorName ,verse: that.verse, refer: that.refer ,bookName: thisBot.tags.gameData.bookName });

        // thisBot.showSelectBookMessage();
        // setTag(thisBot,"label","Place Prize");
        // setTag(thisBot,"isPlaceTrophyButton",true);
        // setTag(thisBot,"isCreateGameButton",false);
    }
}else {
    os.toast("Please First Hide the Created Trophy in a Book!")
}

