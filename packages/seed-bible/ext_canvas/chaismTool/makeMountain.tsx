setDisableMakeMountain(true);
const dim = os.getCurrentDimension();

const finalColor = [255, 255, 255];
const initialColor = [160,82,45];
const colorDifference = [finalColor[0] - initialColor[0], finalColor[1] - initialColor[1], finalColor[2] - initialColor[2]];
let startingZ = 0.5;
let secondDivident, secondRed, secondGreen, secondBlue;

const startColor = { r: 93, g: 64, b: 55 }; // Brown
const endColor = { r: 255, g: 255, b: 255 }; // White

function interpolateColor(start, end, step, steps) {
    const interpolateStep = (end - start) / steps;
    return Math.round(start + interpolateStep * step);
}

function generateColorGradient(startColor, endColor, steps, step) {
    const r = interpolateColor(startColor.r, endColor.r, step, steps);
    const g = interpolateColor(startColor.g, endColor.g, step, steps);
    const b = interpolateColor(startColor.b, endColor.b, step, steps);
    return { r, g, b };
}

const correctRange = ({type, value}) => {
    switch (type) {
        case "color": {
            if(value > 255){
                return 255;
            }else if (value < 0){
                return 0;
            }else{
                return value;
            }
            break
        }
        case "scaleZ": {
            if(value < 0.5){
                return 0.5;
            }else if(value > 10){
                return 10
            }else{
                return value;
            }
            break
        }
    }
}

const calculateScaleZ = ({versesCount, verseIndex, midPoint, divident}) => {
    if(verseIndex < midPoint){
        const scaleZ = correctRange({type: "scaleZ", value: startingZ + parseFloat(divident)});
        startingZ = startingZ + parseFloat(divident);
        return scaleZ;
    }else{
        if(!secondDivident){
            secondDivident = 10 / (versesCount - midPoint);
        }
        const scaleZ = correctRange({type: "scaleZ", value: startingZ - parseFloat(secondDivident.toFixed(2))});
        startingZ = startingZ - parseFloat(secondDivident.toFixed(2));
        return scaleZ;
    }
}

const calculateColor = ({versesCount, verseIndex, midPoint, redDivident, greenDivident, blueDivident}) => {
    if(verseIndex < midPoint){
        const clr = generateColorGradient(startColor, endColor, midPoint, verseIndex);
        return `rgb(${clr.r},${clr.g},${clr.b})`;
    }else{
        const clr = generateColorGradient(startColor, endColor, midPoint, versesCount - verseIndex);
        return `rgb(${clr.r},${clr.g},${clr.b})`;
    }
}

const verseBots = [...globalFunctions.getVerses()];

let midPoint, divident;

if(that?.wordIndex){
    midPoint = that.wordIndex + 1;
    divident = 10 / midPoint;
}else{
    midPoint = Math.floor(verseBots.length / 2);
    divident = 10 / midPoint;
    divident = divident.toFixed(2);
}

let redDivident = colorDifference[0] / midPoint;
redDivident = redDivident.toFixed(2);
let greenDivident = colorDifference[1] / midPoint;
greenDivident = greenDivident.toFixed(2);
let blueDivident = colorDifference[2] / midPoint;
blueDivident = blueDivident.toFixed(2);

globalThis.divident = divident;
globalThis.redDivident = redDivident;
globalThis.greenDivident = greenDivident;
globalThis.blueDivident = blueDivident;

for(let i = 0; i < verseBots.length; i++){
    const scaleZ = verseBots[i].tags.tempScaleZ ? verseBots[i].tags.tempScaleZ : calculateScaleZ({versesCount: verseBots.length, verseIndex: i, midPoint: midPoint, divident: divident});
    const color = calculateColor({versesCount: verseBots.length, verseIndex: i, midPoint: midPoint, redDivident: redDivident, greenDivident: greenDivident, blueDivident: blueDivident})
    setTimeout(() => {
        animateTag(verseBots[i], {
            fromValue: {
                scaleZ: verseBots[i].masks.scaleZ ? verseBots[i].masks.scaleZ : verseBots[i].tags.scaleZ
            },
            toValue: {
                scaleZ: scaleZ
            },
            duration: 1,
            tagMaskSpace: "tempLocal"
        }).then(() => {
            setTagMask(verseBots[i], "scaleZ", scaleZ, "tempLocal");
            setTagMask(verseBots[i], "color", color, "tempLocal");
            setTagMask(verseBots[i], "onPointerDown", thisBot.tags.WBOnPointerDown, "tempLocal");
            setTagMask(verseBots[i], "onPointerUp", thisBot.tags.WBOnPointerUp, "tempLocal");
            setTagMask(verseBots[i], "onPointerEnter", thisBot.tags.WBOnPointerEnter, "tempLocal");
            setTagMask(verseBots[i], "clicking", false, "tempLocal");
            setTagMask(verseBots[i], "draggable", false, "tempLocal");
        })
    }, i * 150)
}

setTimeout(() => setDisableMakeMountain(false), 150 * verseBots.length);

const totalTime = (verseBots.length + 10) * 150;
const tray = getBot("tray");
await os.focusOn(tray, {
    zoom: gridPortalBot.tags.pixelWidth > 768 ? 10 : 5,
    duration: totalTime / 12000,
    rotation: {x: 0, y: 0, z: 0, normalize: false}
})

await os.focusOn(tray, {
    zoom: gridPortalBot.tags.pixelWidth > 768 ? 7 : 3.5,
    duration: totalTime / 6000,
    rotation: {x: Math.PI * 1, y: Math.PI * 0.25, normalize: false}
})

await os.focusOn(tray, {
    zoom: gridPortalBot.tags.pixelWidth > 768 ? 12 : 6,
    duration: totalTime / 3000,
    rotation: {x: Math.PI * 1, y: Math.PI * 1.25, normalize: false},
    easing: "sinusoidal"
})

await os.focusOn(tray, {
    zoom: gridPortalBot.tags.pixelWidth > 768 ? 7 : 3.5,
    duration: totalTime / 3000,
    rotation: {x: Math.PI * 1, y: Math.PI * 2.25, normalize: false},
    easing: "sinusoidal"
})

await os.focusOn(tray, {
    zoom: gridPortalBot.tags.pixelWidth > 768 ? 10 : 5,
    duration: totalTime / 12000,
    rotation: {x: 0, y: 0, z: 0, normalize: false}
})

if(!getBot("system", "introduction.searchBar").masks.initChaism){
    const theBot = getBot(byTag("wordBot"), byTag("index", 39));
    console.log(theBot, "theBot")
    if(theBot){
        await os.sleep(1000);
        await os.focusOn(theBot, {
            duration: 1,
            rotation: {
                normalize: false,
                x: Math.PI * 0.25,
                y: Math.PI * 0.25
            },
            zoom: gridPortalBot.tags.pixelWidth > 768 ? 12 : 6
        });
    }
}