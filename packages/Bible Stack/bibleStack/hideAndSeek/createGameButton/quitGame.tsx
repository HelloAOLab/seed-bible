const { render } = os.appHooks;
os.unregisterApp("showSelectedBook");
os.unregisterApp("messageInput");
os.unregisterApp("selectBookMessage");
os.unregisterApp("results");
os.unregisterApp("selectBookMessage");
os.unregisterApp('hints');
os.unregisterApp("welcomeScreen");
os.unregisterApp("quitGame");
os.unregisterApp("triedUI");
os.unregisterApp("bookSelected");
os.unregisterApp("hotseatStartScreen");
os.unregisterApp("startGameTimer");
os.unregisterApp("showMessage");
os.unregisterApp("startVerseGame");
os.unregisterApp("hideAndSeekSideBar");
render(<></>, document.body);
SetShowDonateButton(true);
// setTagMask(introductionManager,"areBibleElementsDraggable",true);

const cloneBooks = getBots(byTag("system","hideAndSeek.arrangementBookClone"),byTag("initialized",true));
const playingTrophy = getBot(byTag("isPlaying",true),byTag("isTrophy",true));
const isCreatingGame = getBot(byTag("isCreateGameButton",true),byTag("isActive",true));
globalThis.bookClickWait = false;
globalThis.bundleAnimating = false;
globalThis.startingVerseGame = false;
globalThis.hideSeekFutherPlay = false;
globalThis.skipAnimation = false;
// const previousExplodedViewSections = getBots("isInExplodedView", true);
shout("toggleBookDrag",{draggable: true});

if(playingTrophy) {
    destroy(playingTrophy);
}

if(isCreatingGame) {
    destroy(isCreatingGame);
}

// if (previousExplodedViewSections.length) {
//     previousExplodedViewSections.forEach(section=>{
//         section?.unsetExplodedViewState();
//     })
// }

destroy(cloneBooks);

const allGrayScaledBots = getBots("isGrayScaled",true);

whisper(allGrayScaledBots,"changeColor",{ grayScaleColor: false });
await os.sleep(100);
const mainWord = getBot("isMainWord", true);
mainWord.resetBible();
try {
    os.focusOn(
        {
            x: -8, 
            y: 20,
            z: 0,
        }, 
        {
            duration: 0.5,
            rotation:  {x: 1.01229, y:0.5},
            zoom: 6,
            easing: {
                type: "sinusoidal",
                mode: "inout"
            }
        }
    );

}catch {

}
shout("initUi");