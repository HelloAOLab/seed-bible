if(masks.currentTarget){
    let currentTarget = getBot(byID(masks.currentTarget));
    let scaleZ = currentTarget.masks.scaleZ + parseFloat(divident);
    if(scaleZ > 10){
        return
    }
    let prevColor = currentTarget.masks.color;
    shout("handleUndoStack", {
        action: "add",
        id: currentTarget.tags.id,
        tags: ["scaleZ", "color"],
        prevValues: [currentTarget.masks.scaleZ, prevColor]
    });
    let prevColorArrar = prevColor.slice(4,prevColor.length-1).split(",");
    let newColor = `rgb(${parseInt(prevColorArrar[0] - redDivident)}, ${parseInt(prevColorArrar[1] - greenDivident)}, ${parseInt(prevColorArrar[2] - blueDivident)})`
    setTagMask(currentTarget, "scaleZ", scaleZ, "tempLocal");
    setTagMask(currentTarget, "color", newColor, "tempLocal");
}