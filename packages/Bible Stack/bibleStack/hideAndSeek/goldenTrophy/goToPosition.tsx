const dimension = os.getCurrentDimension();
const mainWordUpperCover = getBot("isMainWordUpperCover", true);

await animateTag(thisBot, {
    fromValue: {
        [dimension + "X"]: thisBot.tags.homeX,
        [dimension + "Y"]: thisBot.tags.homeY,
        [dimension + "Z"]: 0,
    },
    toValue: {
        [dimension + "X"]: mainWordUpperCover.tags.homeX + 10,
        [dimension + "Y"]: mainWordUpperCover.tags.homeY - 15,
        [dimension + "Z"]: 0,
    },
    duration: 1
})