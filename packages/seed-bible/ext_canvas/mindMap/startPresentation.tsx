const lineColors = ["#FF4081", "#E040FB", "#7C4DFF", "#536DFE", "#448AFF", "#40C4FF", "#18FFFF", "#64FFDA", "#69F0AE"];
const botColors = ["#FCE4EC", "#F3E5F5", "#EDE7F6", "#E8EAF6", "#E3F2FD", "#E1F5FE", "#E0F7FA", "#E0F2F1", "#E8F5E9"];
tags.focusManager.childIds = [...that.childList];
tags.focusManager.currentChild = tags.focusManager.childIds[0];
// os.focusOn(getBot(byTag("id", tags.focusManager.childIds[0])), {
//     duration: 4,
//     rotation: {x: 0, y: 0, z: 0},
//     zoom: 10,
// });
// superShout("focus", {bot: getBot(byTag("id", tags.focusManager.childIds[0]))});
getBot('system', 'ext_canvas.mindMap').tags.focusBotId = tags.focusManager.childIds[0];
whisper(thisBot, "makePresentationMode");