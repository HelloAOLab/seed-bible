const image = that.image;

const dim = os.getCurrentDimension();
let typingManager = getBot(byTag("mmTypingManager"));
let aiChatBot = getBot(byID(typingManager.tags.currentWritingBotId));

// let aiText = create({
//     tray: "true",
//     [dim + "X"]: aiChatBot.tags[dim + "X"] + 12,
//     [dim + "Y"]: aiChatBot.tags[dim + "Y"] - (aiChatBot.masks.lineTo ? aiChatBot.masks.lineTo.length * 2 : 0),
//     scaleX: 6,
//     scaleY: 1,
//     scaleZ: 0.1,
//     space: "tempLocal",
//     [dim]: true,
//     aiText: true,
//     color: "#448AFF",
//     formOpacity: 0.2,
//     strokeColor: "#448AFF",
//     label: aiChatBot.tags.label !== "Type your questions here!" ? aiChatBot.tags.label : aiChatBot.masks.label,
//     onDrop: `@ shout("moveChildrens", {...that, id: thisBot.tags.id});`,
//     onDestroy: `@ destroy(masks.lineTo)`,
//     labelFontSize: 1,
//     toErase: true
// })

// let currentTray = create({
//     tray: "true",
//     [dim + "X"]: aiChatBot.tags[dim + "X"] + 24,
//     [dim + "Y"]: aiChatBot.tags[dim + "Y"] - 2 - (aiChatBot.masks.lineTo ? aiChatBot.masks.lineTo.length * 2 : 0),
//     scaleX: 6,
//     scaleY: 6,
//     scaleZ: 0.1,
//     space: "tempLocal",
//     [dim]: true,
//     aiTray: true,
//     strokeColor: "#448AFF",
//     formAddress: image,
//     labelFontSize: 1,
//     toErase: true
// });

let aiText = whisper(typingManager, "createMMBot", {from: {x: aiChatBot.tags.initPos.x, y: aiChatBot.tags.initPos.y}, parentBot: aiChatBot, label: aiChatBot.masks.label ? aiChatBot.masks.label : " "})[0].bot;
await os.sleep(100)
let currentTray = whisper(typingManager, "createMMBot", {from: {x: aiText.tags.initPos.x, y: aiText.tags.initPos.y}, parentBot: aiText, config: {
    formAddress: image,
}}).bot;

// setTagMask(aiText, "lineTo", [currentTray.tags.id], "tempLocal");
// setTagMask(aiChatBot, "lineTo", aiChatBot.masks.lineTo ? [...aiChatBot.masks.lineTo, aiText.tags.id] : [aiText.tags.id], "tempLocal");
aiChatBot.masks.label = " ";