let text: string = that.text;
const position = that.position;
const dim = os.getCurrentDimension();
const typingManager = getBot(byTag("mmTypingManager"));
const aiChatBot = getBot(byID(typingManager.tags.currentWritingBotId));

text = text.replace(/(\r\n|\n|\r)/gm, " ")
const words = text.split(" ");
let startingX = 0;
let startingY = 0;
const maxX = 1;
let maxY = 1;
const index = 0;

let wordLengthTotal = 0;

for(let k = 0; k < words.length; k++){
    const wordLength = thisBot.calcWord({label: words[k]});
    if(startingX + wordLength > 20){
        startingX = 0;
        startingY -= 1;
        maxY += 1;
    }
    startingX = startingX + wordLength;
    wordLengthTotal += wordLength;
}

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
//     label: that?.label ? that.label : aiChatBot.tags.label !== "Type your questions here!" ? aiChatBot.tags.label : aiChatBot.masks.label,
//     onDrop: `@ shout("moveChildrens", {...that, id: thisBot.tags.id});`,
//     onDestroy: `@ destroy(masks.lineTo)`,
//     labelFontSize: 1,
//     toErase: true
// })

// let currentTray = create({
//     tray: "true",
//     [dim + "X"]: aiChatBot.tags[dim + "X"] + 24 + (maxY > 1 ? 20 : startingX) / 2,
//     [dim + "Y"]: maxY > 1 ? aiChatBot.tags[dim + "Y"] - ((maxY * 0.8) / 2) - (aiChatBot.masks.lineTo ? aiChatBot.masks.lineTo.length * 2 : 0) : aiChatBot.tags[dim + "Y"] - (aiChatBot.masks.lineTo ? aiChatBot.masks.lineTo.length * 2 : 0),
//     scaleX: maxY > 1 ? 20 : startingX,
//     scaleY: maxY > 1 ? maxY * 0.8 + 1 : 1,
//     scaleZ: 0.1,
//     space: "tempLocal",
//     [dim]: true,
//     aiTray: true,
//     color: "#448AFF",
//     formOpacity: 0.2,
//     strokeColor: "#448AFF",
//     label: text,
//     labelPadding: maxY > 1 ? 1 : 0,
//     labelFontSize: 2,
//     toErase: true
// });

const aiText = whisper(typingManager, "createMMBot", {from: {x: aiChatBot.tags.initPos.x, y: aiChatBot.tags.initPos.y}, parentBot: aiChatBot, label: aiChatBot.masks.label ? aiChatBot.masks.label : " "})[0].bot;
await os.sleep(100)
const currentTray = whisper(typingManager, "createMMBot", {from: {x: aiText.tags.initPos.x, y: aiText.tags.initPos.y}, parentBot: aiText, label: text}).bot;

// setTagMask(aiText, "lineTo", [currentTray.tags.id], "tempLocal");
// setTagMask(aiChatBot, "lineTo", aiChatBot.masks.lineTo ? [...aiChatBot.masks.lineTo, aiText.tags.id] : [aiText.tags.id], "tempLocal");
aiChatBot.masks.label = " ";