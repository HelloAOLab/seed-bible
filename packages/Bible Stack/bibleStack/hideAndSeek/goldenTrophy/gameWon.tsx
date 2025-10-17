const dimension = os.getCurrentDimension();
const bookBot = getBot("bookName",that.prizeBookName); 

await animateTag(thisBot,{
    fromValue: {
        [dimension + "X"]: thisBot.tags.homeX,
        [dimension + "Y"]: thisBot.tags.homeY,
        [dimension + "Z"]: thisBot.tags.homeZ,
    },
    toValue: {
        [dimension + "X"]: bookBot.tags.homeX + 4,
        [dimension + "Y"]: bookBot.tags.homeY,
        [dimension + "Z"]: bookBot.tags.homeZ,
    },
    duration: 0.1
});
whisper(thisBot,"showResults",{gameWon: true});