let dim = os.getCurrentDimension();
let colorBot = that.bot;
let lineColors = ["#FF4081", "#E040FB", "#7C4DFF", "#536DFE", "#448AFF", "#40C4FF", "#18FFFF", "#64FFDA", "#69F0AE"];
let botColors = ["#FCE4EC", "#F3E5F5", "#EDE7F6", "#E8EAF6", "#E3F2FD", "#E1F5FE", "#E0F7FA", "#E0F2F1", "#E8F5E9"];
if(colorBot.masks.interval){
    await clearInterval(colorBot.masks.interval);
    await clearInterval(colorBot.masks.interval2);
    colorBot.masks.interval = null;
    colorBot.masks.interval2 = null;
}
colorBot.masks.startColor = that.startingColor;
colorBot.masks.endColor = that.endingColor;
colorBot.masks.currentColor = colorBot.masks.startColor;
colorBot.masks.difference = [(colorBot.masks.startColor[0] - colorBot.masks.endColor[0])/40,(colorBot.masks.startColor[1] - colorBot.masks.endColor[1])/40,(colorBot.masks.startColor[2] - colorBot.masks.endColor[2])/15];
colorBot.masks.forward = true;
let interval = setInterval(() => {
    if(colorBot.masks.forward){
        colorBot.masks.currentColor = [colorBot.masks.currentColor[0] - colorBot.masks.difference[0],colorBot.masks.currentColor[1] - colorBot.masks.difference[1],colorBot.masks.currentColor[2] - colorBot.masks.difference[2]];
        if(colorBot.masks.currentColor[0] < colorBot.masks.endColor[0]){
            colorBot.masks.forward = false;
        }
        if(colorBot.tags.id === tags.currentWritingBotId || (colorBot.tags.textBot ? colorBot.tags.textBot === tags.currentWritingBotId : false)){
            colorBot.masks.color = "#FCE4EC";
            colorBot.masks.strokeColor = "#FF4081";
            return
        }
        setTagMask(colorBot, "strokeColor", `rgb(${Math.floor(colorBot.masks.currentColor[0])},${Math.floor(colorBot.masks.currentColor[1])},${Math.floor(colorBot.masks.currentColor[2])})`, "tempLocal");
    }else{
        colorBot.masks.currentColor = [colorBot.masks.currentColor[0] + colorBot.masks.difference[0],colorBot.masks.currentColor[1] + colorBot.masks.difference[1],colorBot.masks.currentColor[2] + colorBot.masks.difference[2]];
        if(colorBot.masks.currentColor[0] > colorBot.masks.startColor[0]){
            colorBot.masks.forward = true;
        }
        if(colorBot.tags.id === tags.currentWritingBotId || (colorBot.tags.textBot ? colorBot.tags.textBot === tags.currentWritingBotId : false)){
            colorBot.masks.color = "#FCE4EC";
            colorBot.masks.strokeColor = "#FF4081";
            return
        }
        setTagMask(colorBot, "strokeColor", `rgb(${Math.floor(colorBot.masks.currentColor[0])},${Math.floor(colorBot.masks.currentColor[1])},${Math.floor(colorBot.masks.currentColor[2])})`, "tempLocal");
    }
}, 200);
colorBot.masks.interval = interval;
if(colorBot){
    if(colorBot.tags[dim + "Z"] <= that.initialZ){
        animateTag(colorBot, {
            fromValue: {
                [dim + "Z"]: colorBot.tags[dim + "Z"]
            },
            toValue: {
                [dim + "Z"]: colorBot.tags[dim + "Z"] + 0.15
            },
            duration: 0.6,
            tagMaskSpace: "tempLocal"
        })
    }else if(colorBot.tags[dim + "Z"] >= that.initialZ){
        animateTag(colorBot, {
            fromValue: {
                [dim + "Z"]: colorBot.tags[dim + "Z"]
            },
            toValue: {
                [dim + "Z"]: colorBot.tags[dim + "Z"] - 0.15
            },
            duration: 0.6,
            tagMaskSpace: "tempLocal"
        });
    }
}
let interval2 = setInterval(() => {
    if(colorBot){
        if(colorBot.tags[dim + "Z"] <= that.initialZ){
            animateTag(colorBot, {
                fromValue: {
                    [dim + "Z"]: colorBot.tags[dim + "Z"]
                },
                toValue: {
                    [dim + "Z"]: colorBot.tags[dim + "Z"] + 0.15
                },
                duration: 0.6,
                tagMaskSpace: "tempLocal"
            })
        }else if(colorBot.tags[dim + "Z"] >= that.initialZ){
            animateTag(colorBot, {
                fromValue: {
                    [dim + "Z"]: colorBot.tags[dim + "Z"]
                },
                toValue: {
                    [dim + "Z"]: colorBot.tags[dim + "Z"] - 0.15
                },
                duration: 0.6,
                tagMaskSpace: "tempLocal"
            });
        }
    }
}, 700)
colorBot.masks.interval2 = interval2;
