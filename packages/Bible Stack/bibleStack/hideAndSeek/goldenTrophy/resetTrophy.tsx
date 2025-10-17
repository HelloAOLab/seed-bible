const dimension = os.getCurrentDimension();

setTagMask(thisBot, "isAnimating", true);

const allGrayScaledBots = getBots("isGrayScaled",true);

whisper(allGrayScaledBots,"changeColor",{ grayScaleColor: false });

// this.expandSelf();
await animateTag(thisBot,{
     fromValue: {
        [dimension + "Z"]: thisBot.tags.homeZ,
    },
    toValue: {
        [dimension + "Z"]: thisBot.tags.homeZ + 2,
    },
    duration: 1
});

await os.sleep(500)

this.goToPosition();

await os.sleep(2000);

setTagMask(thisBot, "isAnimating", false);