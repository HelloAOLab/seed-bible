const dim = os.getCurrentDimension();
setTagMask(thisBot, "clicking", true, "tempLocal");
const increaseSize = () => {
    const scaleZ = thisBot.masks.scaleZ + parseFloat(divident);
    if(scaleZ > 10){
        return
    }
    const prevColor = thisBot.masks.color;
    shout("handleUndoStack", {
        action: "add",
        id: thisBot.tags.id,
        tags: ["scaleZ", "color"],
        prevValues: [thisBot.masks.scaleZ, prevColor]
    });
    shout("handleRedoStack", {action: "clean"});
    const prevColorArrar = prevColor.slice(4,prevColor.length-1).split(",");
    const newColor = `rgb(${parseInt(prevColorArrar[0] - redDivident)}, ${parseInt(prevColorArrar[1] - greenDivident)}, ${parseInt(prevColorArrar[2] - blueDivident)})`
    setTagMask(thisBot, "scaleZ", scaleZ, "tempLocal");
    setTagMask(thisBot, "color", newColor, "tempLocal");
}

const decreaseSize = () => {
    const scaleZ = thisBot.masks.scaleZ - parseFloat(divident);
    if(scaleZ < 0.1){
        return
    }
    const prevColor = thisBot.masks.color;
    shout("handleUndoStack", {
        action: "add",
        id: thisBot.tags.id,
        tags: ["scaleZ", "color"],
        prevValues: [thisBot.masks.scaleZ, prevColor]
    });
    shout("handleRedoStack", {action: "clean"});
    const prevColorArrar = prevColor.slice(4,prevColor.length-1).split(",");
    const newColor = `rgb(${parseInt(parseFloat(prevColorArrar[0]) + parseFloat(redDivident))}, ${parseInt(parseFloat(prevColorArrar[1]) + parseFloat(greenDivident))}, ${parseInt(parseFloat(prevColorArrar[2]) + parseFloat(blueDivident))})`
    setTagMask(thisBot, "scaleZ", scaleZ, "tempLocal");
    setTagMask(thisBot, "color", newColor, "tempLocal");
}

if(masks.to){
    clearTimeout(masks.to);
    masks.to = null;
}

if(masks.it){
    clearInterval(masks.it);
    masks.it = null;
}

if(currentMode === "build"){
    increaseSize();
    const to = setTimeout(() => {
        if(masks.clicking){
            const it = setInterval(() => {
                shout("handleIncreaseSize");
            }, 100);
            setTagMask(thisBot, "it", it, "tempLocal");
        }
    }, 500);
    setTagMask(thisBot, "to", to, "tempLocal");
}else if(currentMode === "dig"){
    decreaseSize();
    const to = setTimeout(() => {
        if(masks.clicking){
            const it = setInterval(() => {
                shout("handleDecreaseSize");
            }, 100);
            setTagMask(thisBot, "it", it, "tempLocal");
        }
    }, 500);
    setTagMask(thisBot, "to", to, "tempLocal");
}else if(currentMode === "level"){
    const chaismTool = getBot("system", "ext_canvas.chaismTool");
    if(chaismTool.masks.prevHeight){
        shout("handleUndoStack", {
            action: "add",
            id: thisBot.tags.id,
            tags: ["scaleZ", "color"],
            prevValues: [thisBot.masks.scaleZ, thisBot.masks.color]
        });
        shout("handleRedoStack", {action: "clean"});
        setTagMask(setTagMask(thisBot, "scaleZ", chaismTool.masks.prevHeight, "tempLocal"));
        setTagMask(thisBot, "color", chaismTool.masks.prevColor, "tempLocal");
    }else{
        os.toast("copied target height and color")
        setTagMask(chaismTool, "prevHeight", thisBot.masks.scaleZ, "tempLocal");
        setTagMask(chaismTool, "prevColor", thisBot.masks.color, "tempLocal");
        create(thisBot, {
            [dim + "X"]: -5,
            [dim + "Y"]: -2,
            tempWordBot: true
        })
        let i = 0;
        const it = setInterval(() => {
            if(thisBot.masks.strokeColor === "white"){
                setTagMask(thisBot, "strokeColor", "transparent", "tempLocal")
                i++
            }else{
                setTagMask(thisBot, "strokeColor", "white", "tempLocal")
                i++
            }
            if(i === 9){
                setTagMask(thisBot, "strokeColor", "transparent", "tempLocal")
                clearInterval(it);
            }
        }, 100);
    }
}else if(currentMode === "setHigh"){
    // shout("handleUndoStack", {
    //     action: "add",
    //     id: thisBot.tags.id,
    //     tags: ["scaleZ", "color"],
    //     prevValues: [thisBot.masks.scaleZ, thisBot.masks.color]
    // });
    // shout("handleRedoStack", {action: "clean"});
    // setTagMask(thisBot, "scaleZ", 10, "tempLocal");
    // setTagMask(thisBot, "color", "rgb(244,67,54)", "tempLocal");
    console.log("cli")
    shout("makeMountain", {wordIndex: thisBot.tags.index})
}else if(currentMode === "color"){
    if(selectedColor){
        shout("handleUndoStack", {
            action: "add",
            id: thisBot.tags.id,
            tags: ["labelColor"],
            prevValues: [thisBot.masks.labelColor]
        });
        shout("handleRedoStack", {action: "clean"});
        setTagMask(thisBot, "labelColor", selectedColor, "tempLocal");
    }
}else{
    setTagMask(thisBot, "previousValue", {scaleZ: masks.scaleZ, color: masks.color}, "tempLocal");
    setTagMask(thisBot, "color", "white", "tempLocal");
    animateTag(thisBot, {
        fromValue: {scaleZ: thisBot.masks.scaleZ},
        toValue: {scaleZ: 0.1},
        duration: 0.5,
        easing: "linear"
    }).then(() => {
        setTimeout(() => {
            animateTag(thisBot, {
                fromValue: {scaleZ: thisBot.masks.scaleZ},
                toValue: {scaleZ: masks.previousValue.scaleZ},
                duration: 0.5,
                easing: "elastic"
            });
            setTagMask(thisBot, "color", masks.previousValue.color, "tempLocal");
            masks.previousValue = null;
        }, 700)
    })
}