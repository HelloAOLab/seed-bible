if(masks.currentTarget){
    let currentTarget = getBot(byID(masks.currentTarget));
    let scaleZ = currentTarget.masks.scaleZ - parseFloat(divident);
    if(scaleZ < 0.1){
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
    let newColor = `rgb(${parseInt(parseFloat(prevColorArrar[0]) + parseFloat(redDivident))}, ${parseInt(parseFloat(prevColorArrar[1]) + parseFloat(greenDivident))}, ${parseInt(parseFloat(prevColorArrar[2]) + parseFloat(blueDivident))})`
    setTagMask(currentTarget, "scaleZ", scaleZ, "tempLocal");
    setTagMask(currentTarget, "color", newColor, "tempLocal");
}