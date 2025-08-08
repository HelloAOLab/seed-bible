setDisableMakeMountain(true);
let verseBots = [...globalFunctions.getVerses()].reverse();
for(let i = 0; i < verseBots.length; i++){
    setTimeout(() => {
        animateTag(verseBots[i], {
            fromValue: {
                scaleZ: verseBots[i].masks.scaleZ
            },
            toValue: {
                scaleZ: 0.1
            },
            duration: 0.12
        }).then(() => {
            verseBots[i].masks.scaleZ = null;
            verseBots[i].masks.color = null;
            verseBots[i].masks.onPointerDown = null;
            verseBots[i].masks.onPointerUp = null;
            verseBots[i].masks.clicking = null;
            verseBots[i].masks.draggable = null;
            verseBots[i].masks.strokeColor = null;
            verseBots[i].tags.scaleZ = 0.1;
        })
    }, i * 120)
}
setTimeout(() => setDisableMakeMountain(false), 120 * verseBots.length);
clearTagMasks(thisBot);
console.log("verses cleared");

let totalTime = (verseBots.length + 10) * 120;

let tray = getBot("tray");

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
    duration: totalTime / 6000,
    rotation: {x: 0, y: 0, z: 0, normalize: false}
})