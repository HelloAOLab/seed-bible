let dim = os.getCurrentDimension();
for(let i = 0; i < that.childrenIds.length; i++){
    let children = getBot(byTag("id", that.childrenIds[i]));
    let childernIndex = getBot(byTag("id", children.tags.indexBot));
    children.tags.initPos = {x: children.tags[dim + "X"] - that.xDisposition, y: children.tags[dim + "Y"] - that.yDisposition}
    let childNewPos = {x: children.tags[dim + "X"] - that.xDisposition, y: children.tags[dim + "Y"] - that.yDisposition}
    let childIndexNewPos = {x: childernIndex.tags[dim + "X"] - that.xDisposition, y: childernIndex.tags[dim + "Y"] - that.yDisposition}
    setTagMask(children, `${dim + "X"}`, childNewPos.x, "shared")
    setTagMask(children, `${dim + "Y"}`, childNewPos.y, "shared")
    setTagMask(childernIndex, `${dim + "X"}`, childIndexNewPos.x, "shared")
    setTagMask(childernIndex, `${dim + "Y"}`, childIndexNewPos.y, "shared")
    // animateTag(children, {
    //     fromValue: {
    //         [dim + "X"]: children.tags[dim + "X"],
    //         [dim + "Y"]: children.tags[dim + "Y"]
    //     },
    //     toValue: {
    //         [dim + "X"]: childNewPos.x,
    //         [dim + "Y"]: childNewPos.y
    //     },
    //     duration: 0.1,
    //     tagMaskSpace: "tempShared"
    // })
    // animateTag(childernIndex, {
    //     fromValue: {
    //         [dim + "X"]: childernIndex.tags[dim + "X"],
    //         [dim + "Y"]: childernIndex.tags[dim + "Y"]
    //     },
    //     toValue: {
    //         [dim + "X"]: childIndexNewPos.x,
    //         [dim + "Y"]: childIndexNewPos.y
    //     },
    //     duration: 0.1,
    //     tagMaskSpace: "tempShared"
    // })
    setTimeout(() => {
        // children.tags[dim + "X"] = childNewPos.x
        // children.tags[dim + "Y"] = childNewPos.y
        // childernIndex.tags[dim + "X"] = childIndexNewPos.x
        // childernIndex.tags[dim + "Y"] = childIndexNewPos.y
    }, 200)
}