const isMobile = gridPortalBot.tags.pixelWidth < 500;

let shiftValueX = isMobile && globalThis.SearchBarHideAndSeek ? 7 : 4;
const zoom = isMobile && globalThis.SearchBarHideAndSeek ? 6 : gridPortalBot.tags.cameraZoom;
const shiftValueZ = isMobile ? 10 : 0;
const dimension = os.getCurrentDimension();

if (that?.shiftValueX) {
    shiftValueX = that.shiftValueX;
}

const onlyZ = that?.onlyZ;

try {
    await os.focusOn(
        {
            x: onlyZ ? gridPortalBot.tags.cameraFocusX : thisBot.tags[dimension + "X"] + shiftValueX, 
            y: onlyZ ? gridPortalBot.tags.cameraFocusY : thisBot.tags[dimension + "Y"] ,
            z: thisBot.tags[dimension + "Z"] + shiftValueZ,
        }, 
        {
            duration: that?.duration || 1,
            zoom,
            easing: {type: "sinusoidal", mode: "inout"},
            rotation: {x: 1.01229, y:0.5},
        }
    );
}catch