os.unregisterApp("startVerseGame")
os.registerApp("startVerseGame")

globalThis.startingVerseGame = true;

const {useState, useMemo, useEffect} = os.appHooks;

const { Modal, ButtonsCover, Button } = Components;

const onPlayVerseGame = async (bookName, bookRank,verse,refer)=>{
    await os.sleep(1000);
    setTag(thisBot,"gameDetails",{
        "bookName": bookName,
        "hints": [],
        "bookRank": bookRank,
        "winMessage": "",
        "creatorName": '',
        verse,
        refer
    });
    thisBot.interact();
}

const StartVerseGame = ()=>{

    const [step,setStep] = useState(globalThis.notFirstInteractionOfVerseGuess?1:0);
    const [hideVerse,setHideVerse] = useState(false);

    const verseData = useMemo(()=> {
        const gameTrophyBot = getBot("isTrophy", true);
        const verseData = gameTrophyBot.getRandomVerse({bookName: that?.bookSelected || null, preDefinedIdex: globalThis.GUESSING_GAME_DIFFICULTY_LEVEL});
        const rank = findNameRank(verseData.selectedBook);
        if (that?.verse && that?.refer) {
            verseData.verse = that.verse;
            verseData.refer = that.refer;
        }
        return {...verseData,rank: rank.rank};
    },[]);

    useEffect(()=>{
        if(verseData.verse){
            if(globalThis.notFirstInteractionOfVerseGuess){
                onPlayVerseGame(verseData.selectedBook, verseData.rank , verseData.verse , verseData.refer);
            }else {
                globalThis.notFirstInteractionOfVerseGuess = true;
            }
        }
    },[verseData])

    return <>
        <style>
            {thisBot.tags['verse-game.css']}
            {introductionManager.tags['google-icon.css']}
        </style>
        {
            step === 0 
            
            ? 
            
            <Modal>
                    <div className="book-style" >
                        <p>We'll give you a <b>verse</b>. Can you <b>guess</b> where it belongs?</p>
                    </div>
                    {step === 0 
                        && 
                        <ButtonsCover>
                            <p></p>
                            <Button onClick={()=>{
                                setStep(p=>p+1);
                                onPlayVerseGame(verseData.selectedBook, verseData.rank,verseData.verse,verseData.refer);
                            }} backgroundColor="black">
                                Play ➤
                            </Button>
                        </ButtonsCover>
                    }
            </Modal>
             :
             <>
                <p className={`verse-game-data ${hideVerse? 'hide' :'show'}`}>
                    {verseData.verse}
                </p>
                <div onClick={()=>setHideVerse(p=>!p)} className="verse-game-icon">
                {
                    hideVerse
                ? 
                <p style={{ display: "flex", alignItems: "center"}}>
                    <span class="material-symbols-outlined">
                        visibility
                    </span> 
                </p> 
                : 
                <span class="material-symbols-outlined">hide</span>
                }
                </div>         
            </>
        }
        </>
};

os.compileApp("startVerseGame" , <StartVerseGame/>)