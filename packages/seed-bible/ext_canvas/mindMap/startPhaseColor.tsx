const dim = os.getCurrentDimension();
const colorBot = that.bot;
const lineColors = ["#FF4081", "#E040FB", "#7C4DFF", "#536DFE", "#448AFF", "#40C4FF", "#18FFFF", "#64FFDA", "#69F0AE"];
const botColors = ["#FCE4EC", "#F3E5F5", "#EDE7F6", "#E8EAF6", "#E3F2FD", "#E1F5FE", "#E0F7FA", "#E0F2F1", "#E8F5E9"];
let time = that.interval;
const divident = Math.floor(time/15);
if(colorBot.masks.interval){
    await clearInterval(colorBot.masks.interval);
    colorBot.masks.interval = null;
}
colorBot.masks.startColor = that.startingColor;
colorBot.masks.endColor = that.endingColor;
colorBot.masks.currentColor = colorBot.masks.startColor;
colorBot.masks.difference = [(colorBot.masks.startColor[0] - colorBot.masks.endColor[0])/15,(colorBot.masks.startColor[1] - colorBot.masks.endColor[1])/15,(colorBot.masks.startColor[2] - colorBot.masks.endColor[2])/15];
if(colorBot.masks.color){
    colorBot.masks.prevColor = colorBot.masks.color;
}
let colorIndexBot;
if(colorBot.tags.indexBot){
    colorIndexBot = getBot(byTag("id", colorBot.tags.indexBot));
}
const interval = setInterval(() => {
    time -= divident;
    if(time < 0){
        colorBot.masks.color = "white";
        clearInterval(interval);
    }
    if(colorIndexBot){
        colorBot.masks.currentColor = [colorBot.masks.currentColor[0] - colorBot.masks.difference[0],colorBot.masks.currentColor[1] - colorBot.masks.difference[1],colorBot.masks.currentColor[2] - colorBot.masks.difference[2]];
        setTagMask(colorBot, "color", `rgb(${Math.floor(colorBot.masks.currentColor[0])},${Math.floor(colorBot.masks.currentColor[1])},${Math.floor(colorBot.masks.currentColor[2])})`, "tempLocal");
        setTagMask(colorIndexBot, "color", `rgb(${Math.floor(colorBot.masks.currentColor[0])},${Math.floor(colorBot.masks.currentColor[1])},${Math.floor(colorBot.masks.currentColor[2])})`, "tempLocal");
    }else{
        colorBot.masks.currentColor = [colorBot.masks.currentColor[0] - colorBot.masks.difference[0],colorBot.masks.currentColor[1] - colorBot.masks.difference[1],colorBot.masks.currentColor[2] - colorBot.masks.difference[2]];
        setTagMask(colorBot, "color", `rgb(${Math.floor(colorBot.masks.currentColor[0])},${Math.floor(colorBot.masks.currentColor[1])},${Math.floor(colorBot.masks.currentColor[2])})`, "tempLocal");
    }
}, divident)
colorBot.masks.colorInterval = interval;