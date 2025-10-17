const dimension = os.getCurrentDimension();
const mainWordUpperCover = getBot("isMainWordUpperCover", true);

animateTag(thisBot, {
    fromValue: {
        [dimension + "Z"]: thisBot.tags.homeZ,
    },
    toValue: {
        [dimension + "Z"]: thisBot.tags.homeZ - 0.1,
    },
    duration: 1
})