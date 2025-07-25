shout("clearUi");
SetShowDonateButton(false);
globalThis.skipAnimation = false;
setTagMask(introductionManager,"areBibleElementsDraggable",false);

const mainWord = getBot("isMainWord", true);
const mainWordContent = getBot("isBaseMainWordContent", false);
const previousSelectedBooks = getBots(byTag("isBook", true), byTag("isSelected", true));
const previousTrayBookOutline = getBot("isTrayBookOutline", true);
const dimension = os.getCurrentDimension();

const isInsideTestamentB = getBots("isInsideTestament",false);

if(previousSelectedBooks)
{
    whisper(previousSelectedBooks,"deselectSelf");
}

if(mainWord.masks.currentState !== "bible" && (isInsideTestamentB.length > 0)) {
    mainWord.resetBible();
    await os.sleep(1000);
    shout("playSound",{soundName: "SectionExpand"});
}



if(mainWord.masks.currentState === "bible") {
    await mainWordContent.interact({gameClick: true});
    const mainWordBibleOldTestament = getBot("isOldTestament", true);
    const mainWordBibleNewTestament = getBot("isNewTestament", true);
    await os.sleep(1000);
    await mainWordBibleOldTestament.selectSelf();
    await os.sleep(5000);
    await mainWordBibleNewTestament.selectSelf();
    await os.sleep(6000);
} else if(mainWord.masks.currentState === "splitIntoTestaments") {
    const mainWordBibleOldTestament = getBot("isOldTestament", true);
    const mainWordBibleNewTestament = getBot("isNewTestament", true);
    if(mainWordBibleOldTestament){
        await mainWordBibleOldTestament.selectSelf();
        await os.sleep(5000);
    }

    if(mainWordBibleNewTestament) {
        await mainWordBibleNewTestament.selectSelf();
        await os.sleep(6000);
    }
}

globalThis.hideSeekPlaying = true;


const { Modal , Button, Loader } = Components;
const { useEffect, useState, useMemo } = os.appHooks;

os.unregisterApp("welcomeScreen");
os.registerApp("welcomeScreen");

const onClose = () =>{
    os.unregisterApp("welcomeScreen");
};

const explodeSection = async (sectionName = "law" , isSingleBook = false) => {
    await thisBot.explodeParent({sectionName , isSingleBook});
}


const startGuideAnimation = async ()=>{
    thisBot.skipButton();
    introductionManager.unHighLightOtherBooks();
    globalThis.bundleAnimating = true;
    globalThis.bookClickWait = true;
    setTagMask(gridPortalBot, "portalPannable", false);
    setTagMask(gridPortalBot, "portalZoomable", false);
    setTagMask(gridPortalBot, "portalRotatable", false);
    shout("changeColor",{grayScaleColor: false});
   
    await explodeSection("law");
    
    await explodeSection("history");
    
    await explodeSection("wisdom");
    
    await explodeSection("prophets");
    
    await explodeSection("gospels");

    await explodeSection("Acts" , true);
    
    await explodeSection("letters");          
    
    await explodeSection("Revelation", true);

    const middleBot = getBot("isCrossHorizontalLine",true);
    const focusOnRotation = {x: 1.01229, y:0.5};

    await os.focusOn(
        {
            x: middleBot.tags[dimension + "X"] + 4, 
            y: middleBot.tags[dimension + "Y"] ,
            z: middleBot.tags[dimension + "Z"] + 16,
        }, 
        {
            duration: 0.6,
            rotation: focusOnRotation,
            zoom: 2.5,
            easing: {
                type: "sinusoidal",
                mode: "inout"
            }
        }
    );
    await os.sleep(800);
    globalThis.bundleAnimating = false;
    globalThis.bookClickWait = false;
    os.unregisterApp("skipAnimation");
    if(!globalThis.skipAnimation && globalThis.hideSeekPlaying) thisBot.ShowHighlighter();
    setTagMask(gridPortalBot, "portalPannable", true);
    setTagMask(gridPortalBot, "portalZoomable", true);
    setTagMask(gridPortalBot, "portalRotatable", true);
}

const onNextClick = async ()=>{
    onClose();
    await startGuideAnimation();
    const randomGameBook = globalThis.getRandomBookCommonName(true);
    const startGameBot = getBot(byTag("system","hideAndSeek.startGame"),byTag("isInitialized",false));
    const booksDetails = globalThis.findNameRank(randomGameBook);

    setTag(startGameBot,"gameDetails",{
        "bookName": randomGameBook,
        "hints": [],
        "bookRank": booksDetails.rank,
        "winMessage": "",
        "creatorName": '',
        "GAME_MODE": globalThis.GAME_MODES.HOTSEAT
    });
    if(globalThis.hideSeekPlaying) startGameBot.interact();
}

const onMakeMyOwn = async () => {
    onClose();
    await startGuideAnimation();
    // Creating The Start Game Button
    const createGameButton = getBot("isCreateGameButton",true);
    const createButton = create(createGameButton,{
        space: "tempLocal",
        isInitialized: true,
        isActive: true,
        creator: null,
        "GAME_MODE": globalThis.GAME_MODES.HOTSEAT
    })
    // destoryAndClose();
    if(globalThis.hideSeekPlaying) createButton.showSelectBookMessage();
}

const WelcomeScreen = ()=>{

    const [step,setStep] = useState(0);

    const [ready,setReady] = useState(()=>{
        const bots = getBots(byTag("isSection",true),byTag("hasOpened",false)).filter(bot=>!bot.masks.selected);
        return bots.length === 0 ? 0 : 4;
    });

    const verse = useMemo(()=>getRandomTop30Verse(),[]);

    useEffect(()=>{
       
        const bots = getBots(byTag("isSection",true),byTag("hasOpened",false));

        bots.forEach((bot)=>{
            if(!bot.masks.selected && globalThis.hideSeekPlaying){
                bot.selectSelf({force: true});
            }
        });

    },[]);

    useEffect(()=>{
        if(ready === 0)  return;

        const timeout  = setTimeout(()=>{
            setReady(p=>p-1);
        },1000);

        return ()=>clearTimeout(timeout);

    },[ready])

    return <>
        <style>{thisBot.tags["hide-seek.css"]}</style>
        <Modal onClose={()=>{}} >
           {
                step === 0 
           ?
                <div className="welcome-copy">
                    <p className="font-heavy">“ <i>{verse.verse}</i> ”</p>
                    <p className="font-heavy"><b>- {verse.refer} </b></p>
                     {ready > 0 ?<p className="text-blue" style={{display: "flex", alignItems: 'center'}}> Preparing your game! <Loader width="28px" height="28px" /> </p> : <p className="text-blue">Ready to go!</p>}
                    <div className="buttons">
                        <p></p>
                        <Button isDisabled={ready > 0} onClick={()=>{
                            shout("toggleBookDrag",{draggable: false});
                            setStep(1);
                        }} backgroundColor="black">
                            Next ➤
                        </Button>
                    </div>
                </div>
            :
                <div className="welcome-copy">
                    <img style={{height: '300px',display: 'block',margin: 'auto'}} alt="hide-seek-play" src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/656a3a693b3c3d13fa2a9c45ced80eed9bf8e8b8c1e8b55725ade6e05559bd48.gif" />
                    <p>This is the <span className="text-blue text-heavy">Bible Stack</span>.</p>
                    <p>Let's play a <b>Guessing Game!</b></p>
                    <p>Can you find the book we've picked for you?</p>
                    <div className="buttons">
                        <Button onClick={onMakeMyOwn} backgroundColor="black">
                            Make Game ✎
                        </Button>
                        <Button onClick={onNextClick} backgroundColor="black">
                            Play ➤
                        </Button>
                    </div>
                </div>
           }
        </Modal>
    </>;
}

os.unregisterApp("quitGame");
os.registerApp("quitGame");

const QuitGame = () => {
    return <>
        <style>{thisBot.tags['google-icon.css']}</style>
        <div 
            style={{
                position: "fixed",
                top: '20px',
                right: "20px",
                zIndex: '99'
            }}
        >
            <Button 
                backgroundColor="black"
                onClick={()=>{
                    const createGameButton = getBot(byTag("isCreateGameButton",true));
                    globalThis.hideSeekPlaying = false;
                    createGameButton.quitGame();
                }}
            >
                ➲ Quit
            </Button>
        </div>
    </>
}

os.compileApp("welcomeScreen",<WelcomeScreen/>);
os.compileApp("quitGame",<QuitGame/>);


