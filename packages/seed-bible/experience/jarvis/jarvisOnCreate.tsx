destroy(getBots(byTag("jarvis"), byTag("id", id => id !== thisBot.id)));

let dim = os.getCurrentDimension();
await animateTag(thisBot, {
    fromValue: {
        scale: 0.1
    },
    toValue: {
        scale: 1.1
    },
    duration: 0.3,
    easing: "elastic"
}).catch(() => {});

thisBot.tags.scale = 1.1;