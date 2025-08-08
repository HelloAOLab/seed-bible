const thinkingAnimation = async (id) => {
    let jarvisInstance = getBot(byID(id));

    setTagMask(jarvisInstance, "color", "blue", "tempLocal");

    while(jarvisInstance.masks.thinking){
        await animateTag(jarvisInstance, {
            fromValue: {
                scale: 1.1
            },
            toValue: {
                scale: 0.6
            },
            duration: 1,
            easing: "linear"
        }).catch(() => {})
        await animateTag(jarvisInstance, {
            fromValue: {
                scale: 0.6
            },
            toValue: {
                scale: 1.1
            },
            duration: 1,
            easing: "linear"
        }).catch(() => {})
        jarvisInstance = getBot(byID(id))
    }

    jarvisInstance.masks.color = null;
}

const movement = async (id, position) => {
    const jarvisInstance = getBot(byID(id));
    clearAnimations(jarvisInstance);
    let dim = os.getCurrentDimension();
    if(configBot.tags.miniMapPortal){
        dim = configBot.tags.miniMapPortal;
    }
    setTagMask(jarvisInstance, `${[dim]}`, true, "tempLocal");
    console.log(dim, configBot.tags.miniMapPortal)

    const x1 = jarvisInstance.tags[dim + "X"];
    const y1 = jarvisInstance.tags[dim + "Y"];
    const x2 = position.x;
    const y2 = position.y;

    const diffX = x2 - x1;
    const diffY = y2 - y1;
    const distance = Math.sqrt((diffX * diffX) + (diffY * diffY));
    if(distance > 20){
        setTagMask(jarvisInstance, `${[dim + "X"]}`, position.x, "tempLocal");
        setTagMask(jarvisInstance, `${[dim + "Y"]}`, position.y, "tempLocal");
        jarvisInstance.tags[dim + "X"] = position.x;
        jarvisInstance.tags[dim + "Y"] = position.y;
        return
    }
    const distanceRemainder = distance % 3
    let jumps = (distance - distanceRemainder) / 3;
    jumps = Math.sqrt(jumps * jumps);
    jarvisInstance.tags[dim + "Z"] = 0;
    for(let i = 1; i <= jumps; i++){
        const n = jumps - i;
        const m = jumps - n;
        const xPos = ((m * x2) + (n * x1)) / (m + n);
        const prevXpos = (((m - 1) * x2) + ((n + 1) * x1)) / (m + n);
        const yPos = ((m * y2) + (n * y1)) / (m + n);
        const prevYpos = (((m - 1) * y2) + ((n + 1) * y1)) / (m + n);
        const midX = (xPos + prevXpos) / 2;
        const midY = (yPos + prevYpos) / 2;
        await animateTag(jarvisInstance, {
            fromValue: {
                [dim + "X"]: prevXpos,
                [dim + "Y"]: prevYpos,
                [dim + "Z"]: 0
            },
            toValue: {
                [dim + "X"]: midX,
                [dim + "Y"]: midY,
                [dim + "Z"]: 1
            },
            duration: 0.25,
            easing: "in"
        })
        await animateTag(jarvisInstance, {
            fromValue: {
                [dim + "X"]: midX,
                [dim + "Y"]: midY,
                [dim + "Z"]: 1
            },
            toValue: {
                [dim + "X"]: xPos,
                [dim + "Y"]: yPos,
                [dim + "Z"]: 0
            },
            duration: 0.25,
            easing: "out"
        })
    }
    jarvisInstance.tags[dim + "X"] = position.x;
    jarvisInstance.tags[dim + "Y"] = position.y;
}

globalThis.aiBotAnimations = {
    movement,
    thinkingAnimation
}