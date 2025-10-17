const dimension = os.getCurrentDimension();
// const mainWord = getBot("isMainWord", true);
const shakeAnimationDuration = 1.25;

const goalBookName = that?.bookName;
if(!goalBookName) {
    os.toast("Book not selected!");
}else {
    const bookBot = getBot(byTag("bookName",goalBookName));

    whisper(thisBot,"createGame",{bookName: goalBookName,bookRank: bookBot.tags.bookRank,hints: that.hints,winMessage: that.winMessage,creatorName: that.creatorName,verse: that.verse, refer: that.refer});
    // destroy(thisBot);

    shout("playSound",{soundName: "BookExpand"});

    // if(thisBot.tags.GAME_MODE === globalThis.GAME_MODES.NORMAL){
    //     whisper(bookBot,"tryToHighlightSelf");
    
    //     animateTag(bookBot, dimension + "RotationZ", {
    //         toValue: -0.05235988 * 2,
    //         duration: (shakeAnimationDuration / 4),
    //         easing: {type: "sinusoidal", mode: "in"}
    //     }).then(() => {
    //         return animateTag(bookBot, dimension + "RotationZ", {
    //             toValue: 0.1308997 * 2,
    //             duration: (shakeAnimationDuration / 4)
    //         })
    //     }).then(() => {
    //         return animateTag(bookBot, dimension + "RotationZ", {
    //             toValue: -0.05235988 * 2,
    //             duration: (shakeAnimationDuration / 4),
    //             easing: {type: "sinusoidal", mode: "out"}
    //         })
    //     }).then(() => {
    //         return animateTag(bookBot, dimension + "RotationZ", {
    //             toValue: 0,
    //             duration: (shakeAnimationDuration / 4),
    //             easing: {type: "sinusoidal", mode: "out"}
    //         })
    //     }).then(()=>{
    //         return os.sleep(500);
    //     }).then(()=>{
    //         whisper(bookBot,"tryToUnhighlightSelf");
    //     });
    // }

    // placeTrophy.reset();
}
