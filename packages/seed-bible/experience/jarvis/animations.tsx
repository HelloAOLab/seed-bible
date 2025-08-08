let thinkingAnimation = async (id) => {
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

let movement = async (id, position) => {
    let jarvisInstance = getBot(byID(id));
    clearAnimations(jarvisInstance);
    let dim = os.getCurrentDimension();
    if(configBot.tags.miniMapPortal){
        dim = configBot.tags.miniMapPortal;
    }
    setTagMask(jarvisInstance, `${[dim]}`, true, "tempLocal");
    console.log(dim, configBot.tags.miniMapPortal)

    let x1 = jarvisInstance.tags[dim + "X"];
    let y1 = jarvisInstance.tags[dim + "Y"];
    let x2 = position.x;
    let y2 = position.y;

    let diffX = x2 - x1;
    let diffY = y2 - y1;
    let distance = Math.sqrt((diffX * diffX) + (diffY * diffY));
    if(distance > 20){
        setTagMask(jarvisInstance, `${[dim + "X"]}`, position.x, "tempLocal");
        setTagMask(jarvisInstance, `${[dim + "Y"]}`, position.y, "tempLocal");
        jarvisInstance.tags[dim + "X"] = position.x;
        jarvisInstance.tags[dim + "Y"] = position.y;
        return
    }
    let distanceRemainder = distance % 3
    let jumps = (distance - distanceRemainder) / 3;
    jumps = Math.sqrt(jumps * jumps);
    jarvisInstance.tags[dim + "Z"] = 0;
    for(let i = 1; i <= jumps; i++){
        let n = jumps - i;
        let m = jumps - n;
        let xPos = ((m * x2) + (n * x1)) / (m + n);
        let prevXpos = (((m - 1) * x2) + ((n + 1) * x1)) / (m + n);
        let yPos = ((m * y2) + (n * y1)) / (m + n);
        let prevYpos = (((m - 1) * y2) + ((n + 1) * y1)) / (m + n);
        let midX = (xPos + prevXpos) / 2;
        let midY = (yPos + prevYpos) / 2;
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