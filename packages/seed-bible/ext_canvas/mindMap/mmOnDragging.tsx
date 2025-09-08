let dim = os.getCurrentDimension();
let textBot = getBot(byTag("id", tags.indexBot));
setTagMask(thisBot, `${dim + "X"}`, that.to.x, "shared")
setTagMask(thisBot, `${dim + "Y"}`, that.to.y, "shared")
setTagMask(textBot, `${dim + "X"}`, that.to.x - 3, "shared")
setTagMask(textBot, `${dim + "Y"}`, that.to.y, "shared")
