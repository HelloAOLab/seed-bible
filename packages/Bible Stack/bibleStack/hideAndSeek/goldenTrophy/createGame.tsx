if(!globalThis.hideSeekPlaying) return;
const dimension = os.getCurrentDimension();
const startGameButton = getBot("system","hideAndSeek.startGame");

const totalGames = getBots("system","hideAndSeek.startGame").length;

const isCreatingGame = getBot(byTag("isCreateGameButton",true),byTag("isActive",true));

if(thisBot.tags.GAME_MODE === globalThis.GAME_MODES.HOTSEAT){
    const startGameBot = getBot(byTag("system","hideAndSeek.startGame"),byTag("isInitialized",false));

    // setTag(startGameBot,"gameDetails",{
    //     "bookName": that.bookName,
    //     "hints": [],
    //     "bookRank": that.bookRank,
    //     "winMessage": "",
    //     "creatorName": '',
    //     "GAME_MODE": globalThis.GAME_MODES.HOTSEAT
    // });
    startGameBot.startVerseGuess({hints: [], winMessage: that.winMessage , creatorName: that.creatorName ,bookSelected: that.bookName,verse: that.verse, refer: that.refer});
}else {
    create(startGameButton,{
        [dimension]: true,
        label: `Game ${totalGames}`,
        gameDetails: {
            bookName: that.bookName,
            hints: that.hints || [],
            bookRank: that.bookRank,
            winMessage: that.winMessage,
            creatorName: that.creatorName,
        },
        [dimension + "X"]: 3 + ( 3 * totalGames),
        [dimension + "Y"]: 3 + 5,
        [dimension + "Z"]: 0,
        isInitialized: true
    });
}



destroy(isCreatingGame);