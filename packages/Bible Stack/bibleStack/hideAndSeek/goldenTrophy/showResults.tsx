if(!that) return;

const { useEffect, useState, useMemo, render }  = os.appHooks;
const { Modal, Button, Confetti, ButtonsCover, Select,Loader } = Components;
const dimension = os.getCurrentDimension();
if(updateCustomHeight){
    updateCustomHeight(0);
}
hideAndSeekSidebar(false)
setHotSeatQuery("")
shout("playSound",{soundName: "AbsorbRawLight"});

const clonedBookPresent = getBot("system","hideAndSeek.arrangementBookClone");
const bookBot = getBot(byTag("bookName",thisBot.tags.gameData.bookName),byTag("system","baseElements.book"));
if(clonedBookPresent) {
    bookBot?.createShowBookModal({x: 0, y: 0 , z: -6});
}

const gamesButton = thisBot.pickNRandomGames();

const gameWon = that.gameWon;
await os.unregisterApp("results");
await os.registerApp("results");

const closeUI = () => {
    os.unregisterApp("results"); 
}

const destoryAndClose = () => {
    os.unregisterApp("results");
    os.unregisterApp("triedUI");
    destroy(thisBot);
    destroy(bookBot.tags.cloneBookID);
}

const resetGameFocus = async () => {
    os.unregisterApp("startVerseGame"); 
    const middleBot = getBot("isCrossHorizontalLine",true);
    await introductionManager.makePortalRestrict(); 
    globalThis.hideSeekFutherPlay = false;
    os.focusOn(
        {
            x: middleBot.tags[dimension + "X"] + 4, 
            y: middleBot.tags[dimension + "Y"] ,
            z: middleBot.tags[dimension + "Z"] ,
        }, 
        {
            duration: 0.5,
            easing: {type: "sinusoidal", mode: "inout"},
            rotation: {x: 1.01229, y:0.5},
            zoom: 5
        }
    );
    introductionManager.makePortalFree();
}

const onPlayGame = async ()=>{
    destoryAndClose();
    
    const randomGameBook = globalThis.getRandomBookCommonName();
    const startGameBot = getBot(byTag("system","hideAndSeek.startGame"),byTag("isInitialized",false));
    const booksDetails = globalThis.findNameRank(randomGameBook);
    

    await resetGameFocus();
    setTag(startGameBot,"gameDetails",{
        "bookName": randomGameBook,
        "hints": [],
        "bookRank": booksDetails.rank,
        "winMessage": "",
        "creatorName": ''
    });
    
    startGameBot.startVerseGuess();
}

const onCreateGame = async ()=>{
    // Creating The Start Game Button
    const createGameButton = getBot("isCreateGameButton",true);
    const createButton = create(createGameButton,{
        space: "tempLocal",
        isInitialized: true,
        isActive: true,
        creator: null,
        "GAME_MODE": globalThis.GAME_MODES.HOTSEAT
    })
    destoryAndClose();
    await resetGameFocus();
    createButton.showSelectBookMessage();
}

const Results = () => {

    const [step,setStep] = useState(0);
    const [hasASecondPassed,setHasASecondPassed] = useState(false);

    const revealCh = useMemo(()=>that?.chFinded || GUESSING_GAME_GAME_DEPTH<2,[that,GUESSING_GAME_GAME_DEPTH]);
    const revealLocation = useMemo(()=>that?.verseFinded || GUESSING_GAME_GAME_DEPTH<3,[that,GUESSING_GAME_GAME_DEPTH]);

    const gameData = useMemo(()=>thisBot.tags.gameData,[]);

    const [buttonEnable,setButtonEnable] = useState(!!gameData.winMessage ? 4 : 0 );
    const [diffculty,setDiffculty] = useState(GUESSING_GAME_DIFFICULTY_LEVEL);

    const onChange = (value) => {
        globalThis.GUESSING_GAME_DIFFICULTY_LEVEL = value;
        setDiffculty(value);
    }

    const [gameDepth,setGameDepth] = useState(GUESSING_GAME_GAME_DEPTH);

    const onChangeDepth = (value) => {
        globalThis.GUESSING_GAME_GAME_DEPTH = value;
        setGameDepth(value);
    }

    useEffect(()=>{
        thisBot.showAllElements();
        thisBot.resetTrophy();
        if(!revealCh || !revealLocation) {
            setTimeout(()=>{
                setHasASecondPassed(true);
            },2000);
        }
    },[]);

    useEffect(()=>{
        if(buttonEnable>0){
            setTimeout(()=>{
                setButtonEnable(buttonEnable - 1);
            },1000);
        }
    },[buttonEnable]);

    const onNextClick = async ()=>{

        if(!revealCh) {
            os.unregisterApp("results");
            hideAndSeekSidebar(true);
            hideAndSeekSidebarcloseAble(false);
            guessingGameSetFindingChapter(true);
            globalThis.hideSeekFutherPlay = true;
            return;
        }

        if(!revealLocation) {
            os.unregisterApp("results");
            shout('closeFormMenu');
            let commonName = that.commonName;
            bible.openAt(`${commonName} ${that.winCh}:1`);
            await os.sleep(100)
            shout("playSound",{soundName: "OpenPage"});
            updateCustomHeight(0.8);
            try{
                setVersesState([]);
            }catch{
                os.log('setVersesState not global yet')
            }
            return;
        }
        render(<></>, document.body);
        os.unregisterApp("hideAndSeekSideBar");
        setStep(1);
    }

    return <>
        <style>{thisBot.tags["index.css"]}</style>
        {!hasASecondPassed && <Confetti/>}
        <Modal className={`game-results ${gameWon?"success":"lose"}`} styles={{top: "calc(50% + 50px)"}}>
            {
                step===0
            ?
                <>
                    <p style={{marginBottom: '8px'}}>You found <b>{gameData.bookName}!</b></p>
                    {!!gameData.winMessage && <div>
                        <p className="text-heavy text-blue">You've unlocked this message from {gameData.creatorName}</p>
                        {buttonEnable > 0 ? 
                            <p className="text-blue">Revealing in <span className="text-heavy">{buttonEnable} second</span>.</p>
                        :
                            <div className="message-box">
                                <p className="message-block font-heavy">“ <i>{gameData.winMessage} ”</i></p>
                            </div>
                    }
                    </div>}
                    <p className="verse-block font-heavy">“ <i>{gameData.verse}</i> ”</p>
                    <br/>
                    <p className="verse-block">
                        <span>- {gameData.bookName}  </span>
                        <span className={`location-verse-details ${revealCh && "show"}`}> {gameData.chapter} </span>
                        <span >:</span>
                        <span className={`location-verse-details ${(revealLocation && revealCh) && "show"}`}> 
                            {gameData.verseStart === gameData.verseEnd ? gameData.verseStart : `${gameData.verseStart}-${gameData.verseEnd}` }
                        </span>
                                              </p>
                    <br/>
                    {
                        !revealCh 
                        ?
                            <p>Congratulations! Let's Try to find the <b>Chapter</b>.</p> 
                        :
                        !revealLocation
                        ? 
                            <p>Congratulations! Let's Try to find the <b>Verse</b>.</p>
                        :
                            <p></p>
                    }
                    <ButtonsCover>
                        <p></p>
                        <Button 
                            onClick={onNextClick} 
                            backgroundColor="black"
                        >
                           Next
                        </Button>
                    </ButtonsCover>
                </>
            :
                <>
                    <p> {gameWon?"You won ":"Better luck next time "} in {thisBot.tags.currentTries} guesses! Would you like to <b>play again</b> or <b>make a game for someone next to you?</b></p>
                    <br/>
                    <Select value={diffculty} onChangeListener={onChange} name="Difficulty:" options={GUESSING_GAME_DIFFICULTY_OPTIONS}  />      
                    <Select value={gameDepth} onChangeListener={onChangeDepth} name="Find:" options={GUESSING_GAME_DEPTH_OPTIONS}  />
                    <br/>
                    <ButtonsCover>
                        <Button onClick={onCreateGame} backgroundColor="black">
                            Make Game ✎
                        </Button>
                        <Button onClick={onPlayGame} backgroundColor="black">
                            Play Again!
                        </Button>
                    </ButtonsCover>
                    {
                        gamesButton.length > 0
                            && 
                        <>
                            <b>Explore Games by others: </b>
                            <ButtonsCover>
                                {gamesButton.map(game=><Button onClick={()=>{
                                    game.interact();
                                    destoryAndClose();
                                }}>
                                    {game.tags.label}
                                </Button>)}
                            </ButtonsCover>
                        </>
                    }
                </>
            }
        </Modal>
    </>
}

os.compileApp("results",<Results/>)