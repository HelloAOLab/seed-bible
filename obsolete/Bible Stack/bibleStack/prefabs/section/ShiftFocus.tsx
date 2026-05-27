const isMobile = gridPortalBot.tags.pixelWidth < 500;

const shiftValueX = isMobile && globalThis.SearchBarHideAndSeek ? 7 : 4;
const zoom = isMobile && globalThis.SearchBarHideAndSeek ? 6 : 8;
const shiftValueZ = isMobile ? 10 : 8;
const dimension = os.getCurrentDimension();

await os.focusOn(
    {
        x: thisBot.tags[dimension + "X"] + shiftValueX, 
        y: thisBot.tags[dimension + "Y"] ,
        z: thisBot.tags[dimension + "Z"] + shiftValueZ,
    }, 
    {
        duration: that?.duration || 1,
        zoom,
        easing: {type: "sinusoidal", mode: "inout"},
        rotation: {x: 1.01229, y:0.5},
    }
);