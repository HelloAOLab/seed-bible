if(!globalThis.hideSeekPlaying) return;

const dimension = os.getCurrentDimension();
const createTrophies = getBots("isTrophy",true);

shout("playSound",{soundName: "AOShows"});

os.unregisterApp("showSelectedBook");

const goldenTrophy = createTrophies.find(trophy=>!trophy.tags.initialized);

if(goldenTrophy) {
    const createGameButton = getBot(byTag("system","hideAndSeek.createGameButton"),byTag("isInitialized",true));
    const gamesButton = getBots(byTag("system","hideAndSeek.startGame"),byTag("isInitialized",true));

    const middleBot = getBot("isCrossHorizontalLine",true);
    const focusOnRotation = {x: 1.01229, y:0.5};

    try {
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
    }catch {
        
    }

    animateTag([createGameButton,...gamesButton],{
        fromValue : {
            opacity: 1,
            scale: 1,
            labelFontSize: 1
        },
        toValue : {
            opacity: 0,
            scale: 0,
            labelFontSize: 0
        },
        duration: 0.1
    });

    const [_,location] = thisBot.tags.gameDetails.refer.split(`${thisBot.tags.gameDetails.bookName} `);
    let [chapter,verseNumber] = location.split(":");
    let verseStart,verseEnd;
    if(verseNumber?.includes("-")){
        const verseSplit = verseNumber.split("-");
        verseStart = parseInt(verseSplit[0]);
        verseEnd = parseInt(verseSplit[1]);
    } else {
        verseStart = parseInt(verseNumber);
        verseEnd = parseInt(verseNumber);
    }

    const trophy = create(goldenTrophy,{
        [dimension]: true,
        [dimension + "X"]: thisBot.tags.homeX + 10,
        [dimension + "Y"]: thisBot.tags.homeY - 5,
        [dimension + "Z"]: 0,
        space: "tempLocal",
        initialized: true,
        isActive: false,
        isPlaying: true,
        scaleX: 0,
        scaleZ: 0,
        scaleY: 0,
        gameData: {
            "bookName": thisBot.tags.gameDetails.bookName,
            "bookRank": thisBot.tags.gameDetails.bookRank,
            "hints": thisBot.tags.gameDetails.hints,
            "winMessage": thisBot.tags.gameDetails.winMessage,
            "creatorName": thisBot.tags.gameDetails.creatorName,
            "verse": thisBot.tags.gameDetails.verse,
            "refer": thisBot.tags.gameDetails.refer,
            "chapter": chapter,
            "verseStart": verseStart,
            "verseEnd": verseEnd
        },
        hints: thisBot.tags.gameDetails.hints
    });

    trophy.showCurrentHint();

    const manageBot = getBot("system","introduction.searchBar");
    manageBot.HideAndSeekSideBar();
    globalThis.startingVerseGame = false;
}