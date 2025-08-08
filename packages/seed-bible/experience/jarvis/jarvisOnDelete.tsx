await animateTag(thisBot, {
    fromValue: {
        scale: 1.1
    },
    toValue: {
        scale: 0.1
    },
    duration: 0.3,
    easing: "elastic"
}).catch(() => {})