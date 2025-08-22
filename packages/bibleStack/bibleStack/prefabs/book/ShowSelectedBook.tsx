const { Modal, Button } = Components;
const { useState, useEffect ,useMemo } = os.appHooks;
const trophy = getBot("isTrophy",true);

os.unregisterApp("selectBookMessage");
os.unregisterApp("bookSelected");
os.registerApp("bookSelected");

const createGameButton = getBot(byTag("isCreateGameButton",true),byTag("isInitialized",true));

shout("playSound",{soundName: "SelectTestament"});

thisBot.CreateShowBookModal({z: -6});

const onClickContinue = (verse,refer) => {
    setTag(createGameButton,"gameData", {
        "bookName": thisBot.tags.bookName,
        "bookRank": thisBot.tags.bookRank,
        "hints": [],
        "winMessage": "",
        verse,
        refer
    });

    thisBot.tryToUnhighlightSelf();

    if(createGameButton.tags.GAME_MODE === globalThis.GAME_MODES.HOTSEAT) {
        createGameButton.startHotSeat(
            {
                verse,
                refer
            }
        );
    }else {
        createGameButton.messageInput();
       
    }

    destroy(thisBot.tags.cloneBookID);
    os.unregisterApp("bookSelected");
}

const closeClick = () => {
    os.unregisterApp("bookSelected");
    destroy(thisBot.tags.cloneBookID);
    createGameButton?.showSelectBookMessage();
}


const SelectedBook  = () => {
    const verseList = useMemo(()=>trophy.tags.bibleVerse[thisBot.tags.bookName].map(verseFull=>trophy.splitVerserAndReference({bookName: thisBot.tags.bookName,verse:verseFull})),[]);
    const [selected,setSelected] = useState(GUESSING_GAME_DIFFICULTY_LEVEL - 1);

    useEffect(()=>{
        globalThis.GUESSING_GAME_DIFFICULTY_LEVEL = selected + 1;
    },[selected]);

    return <>
        <style>{thisBot.tags["index.css"]}</style>
        <Modal showIcon={false}  styles={{padding: 0, width: 'auto', borderRadius: '16px',backgroundColor: "transparent"}}>
            <div className="book-style" >
                <div className="book-style-container">
                    <p className="select-book-text">You've selected <b>{thisBot.tags.bookName}</b>.</p>
                    <p>Get ready to <b>swap seats!</b></p>
                    <div
                        style={{padding: "8px 12px" , position: "relative"}}
                    >
                        <div 
                            className="guess-select" 
                            style={{ border: `1px solid black`,fontWeight: '500'}}
                             >
                            {verseList[selected].verse}
                        </div>
                    </div>
                    <div className="guess-select-controls">
                        <Button onClick={()=>setSelected(p=> ((p-1 + verseList.length) % verseList.length) )} >«</Button>
                        <Button onClick={()=>setSelected(p=> ((p + 1) % verseList.length) )}>»</Button>
                    </div>
                    <div className="book-style-buttons">
                        <Button onClick={closeClick} backgroundColor="black">
                            ↩ Change
                        </Button>
                        <p style={{background: VERESE_BG_HEX_CODE[selected].hex, border: `1px solid ${VERESE_BG_HEX_CODE[selected].border}`,padding: "12px", borderRadius: "8px",fontSize: '12px',fontWeight: '800'}}>
                            Level {selected + 1}
                        </p>
                        <Button disabled={selected===-1} onClick={()=>onClickContinue(verseList[selected].verse,verseList[selected].refer)} backgroundColor="black">
                            Ready!
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    </>
}

os.compileApp("bookSelected",<SelectedBook />);