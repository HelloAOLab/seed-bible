const dim = os.getCurrentDimension();
animateTag(thisBot, {
    fromValue: {
        [dim + "Z"]: thisBot.tags[dim + "Z"]
    },
    toValue: {
        [dim + "Z"]: 0.1
    },
    duration: 0.2
})
destroy(getBots('dialogBox'))