if(masks.currentTarget){
    const currentTarget = getBot(byID(masks.currentTarget));
    const scaleZ = currentTarget.masks.scaleZ + parseFloat(divident);
    if(scaleZ > 10){
        return
    }
    const prevColor = currentTarget.masks.color;
    shout("handleUndoStack", {
        action: "add",
        id: currentTarget.tags.id,
        tags: ["scaleZ", "color"],
        prevValues: [currentTarget.masks.scaleZ, prevColor]
    });
    const prevColorArrar = prevColor.slice(4,prevColor.length-1).split(",");
    const newColor = `rgb(${parseInt(prevColorArrar[0] - redDivident)}, ${parseInt(prevColorArrar[1] - greenDivident)}, ${parseInt(prevColorArrar[2] - blueDivident)})`
    setTagMask(currentTarget, "scaleZ", scaleZ, "tempLocal");
    setTagMask(currentTarget, "color", newColor, "tempLocal");
}