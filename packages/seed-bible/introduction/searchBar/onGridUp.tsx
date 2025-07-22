// const x = gridPortalBot.tags.cameraFocusX;
// const y = gridPortalBot.tags.cameraFocusY;
// const z = gridPortalBot.tags.cameraFocusZ;
// const currZoom = 20 - gridPortalBot.tags.cameraZoom;

// if (Math.abs(x) > 10 * currZoom || Math.abs(y) > 10 * currZoom  | Math.abs(z) > 10 * currZoom ) {

//     const middleBot = getBot("isCrossHorizontalLine",true);
//     const dimension = os.getCurrentDimension();
//     const focusOnRotation = {x: 1.01229, y:0.5};

//     setTagMask(gridPortalBot, "portalPannable", false);
//     setTagMask(gridPortalBot, "portalZoomable", false);
//     setTagMask(gridPortalBot, "portalRotatable", false);

//     await os.focusOn(
//         {
//             x: middleBot.tags[dimension + "X"] + 4, 
//             y: middleBot.tags[dimension + "Y"] ,
//             z: middleBot.tags[dimension + "Z"] ,
//         }, 
//         {
//             duration: 0.5,
//             rotation: focusOnRotation,
//             zoom: 6,
//             easing: {
//                 type: "sinusoidal",
//                 mode: "inout"
//             }
//         }
//     );

//     setTagMask(gridPortalBot, "portalPannable", true);
//     setTagMask(gridPortalBot, "portalZoomable", true);
//     setTagMask(gridPortalBot, "portalRotatable", true);

// }