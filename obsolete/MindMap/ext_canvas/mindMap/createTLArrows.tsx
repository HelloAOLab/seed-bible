let dim = os.getCurrentDimension();
const typingTool = getBot(byTag("typingTool"));
let writenBot = getBot(byTag("id", that.id));

// const ArrowUpConfig = {
//     [dim]: true,
//     [dim + "X"]: that[dim + "X"],
//     [dim + "Y"]: that[dim + "Y"] + 1.3,
//     [dim + "Z"]: 0.05,
//     scaleX: 0.7,
//     scaleY: 0.7,
//     scaleZ: 0.1,
//     labelOapcity: 1,
//     formOpacity: 1,
//     space: "tempLocal",
//     color: "#29B6F6",
//     controlBotId: that.id,
//     arrowUp: true,
//     formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/d1221e1a150bcb2335b7f4c1bf8b74cd196daad733cf0bbbdc6e8a86e23fa4ad.png",
//     form: "sprite",
//     draggable: false,
//     onCreate: `@
//         let buttonBots = getBots("arrowUp");
//         for(let i = 0; i < buttonBots.length; i++){
//             if(buttonBots[i].tags.id !== tags.id){
//                 await clearInterval(buttonBots[i].masks.interval);
//                 await clearInterval(buttonBots[i].masks.interval2);
//                 destroy(buttonBots[i])
//             }
//         }
//     `,
//     onClick: `@
//         const typingTool = getBot(byTag("typingTool"));
//         let writenBot = getBot(byTag("id", tags.controlBotId));
//         if(typingTool.tags.dataSlitsManager.state === "incident"){
//             whisper(typingTool, "moveDataSlits", {action: "up"});
//         }else{
//             whisper(typingTool, "createDataSlits", {id: writenBot.tags.id, state: "incident"});
//         }
//     `
// }

// const ArrowDownConfig = {
//     [dim]: true,
//     [dim + "X"]: that[dim + "X"],
//     [dim + "Y"]: that[dim + "Y"] - 1.3,
//     [dim + "Z"]: 0.05,
//     scaleX: 0.7,
//     scaleY: 0.7,
//     scaleZ: 0.1,
//     labelOapcity: 1,
//     formOpacity: 1,
//     space: "tempLocal",
//     color: "#29B6F6",
//     controlBotId: that.id,
//     arrowDown: true,
//     formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/7bf4e2d6fc8cad4b2867e7bded0613ad50a687d7c51ffcb262cb1d9010e09a13.png",
//     form: "sprite",
//     draggable: false,
//     onCreate: `@
//         let buttonBots = getBots("arrowDown");
//         for(let i = 0; i < buttonBots.length; i++){
//             if(buttonBots[i].tags.id !== tags.id){
//                 await clearInterval(buttonBots[i].masks.interval);
//                 await clearInterval(buttonBots[i].masks.interval2);
//                 destroy(buttonBots[i])
//             }
//         }
//     `,
//     onClick: `@
//         const typingTool = getBot(byTag("typingTool"));
//         let writenBot = getBot(byTag("id", tags.controlBotId));
//         if(typingTool.tags.dataSlitsManager.state === "incident"){
//             whisper(typingTool, "moveDataSlits", {action: "down"});
//         }else{
//             whisper(typingTool, "createDataSlits", {id: writenBot.tags.id, state: "incident"});
//         }
//     `
// }

const ArrowLeftConfig = {
    [dim]: true,
    [dim + "X"]: that[dim + "X"] - 3.8,
    [dim + "Y"]: that[dim + "Y"],
    [dim + "Z"]: 0.05,
    scaleX: 0.7,
    scaleY: 0.7,
    scaleZ: 0.1,
    labelOapcity: 1,
    formOpacity: 1,
    space: "tempLocal",
    color: "#29B6F6",
    controlBotId: that.id,
    arrowLeft: true,
    formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/7d7e6dce8eeb9d1ff35d8adf69d098f7d1054bd6a172f56c42ccd487f17e5d2f.png",
    form: "sprite",
    draggable: false,
    onCreate: `@
        let buttonBots = getBots("arrowLeft");
        for(let i = 0; i < buttonBots.length; i++){
            if(buttonBots[i].tags.id !== tags.id){
                await clearInterval(buttonBots[i].masks.interval);
                await clearInterval(buttonBots[i].masks.interval2);
                destroy(buttonBots[i])
            }
        }
    `,
    onClick: `@
        const typingTool = getBot(byTag("typingTool"));
        let writenBot = getBot(byTag("id", tags.controlBotId));
        if(typingTool.tags.dataSlitsManager.state === "time"){
            whisper(typingTool, "moveDataSlits", {action: "left"});
        }else{
            whisper(typingTool, "createDataSlits", {id: writenBot.tags.id, state: "time"});
        }
    `
}

const ArrowRightConfig = {
    [dim]: true,
    [dim + "X"]: that[dim + "X"] + 3.8,
    [dim + "Y"]: that[dim + "Y"],
    [dim + "Z"]: 0.05,
    scaleX: 0.7,
    scaleY: 0.7,
    scaleZ: 0.1,
    labelOapcity: 1,
    formOpacity: 1,
    space: "tempLocal",
    color: "#29B6F6",
    controlBotId: that.id,
    arrowRight: true,
    formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/ca1f63fd38e899fa04518ea44af98fbd4bd029dccd33506b70c05f40519cca3f.png",
    form: "sprite",
    draggable: false,
    onCreate: `@
        let buttonBots = getBots("arrowRight");
        for(let i = 0; i < buttonBots.length; i++){
            if(buttonBots[i].tags.id !== tags.id){
                await clearInterval(buttonBots[i].masks.interval);
                await clearInterval(buttonBots[i].masks.interval2);
                destroy(buttonBots[i])
            }
        }
    `,
    onClick: `@
        const typingTool = getBot(byTag("typingTool"));
        let writenBot = getBot(byTag("id", tags.controlBotId));
        if(typingTool.tags.dataSlitsManager.state === "time"){
            whisper(typingTool, "moveDataSlits", {action: "right"});
        }else{
            whisper(typingTool, "createDataSlits", {id: writenBot.tags.id, state: "time"});
        }
    `
}

// setTimeout(() => {
//     let arrowUp = create(ArrowUpConfig);
//     whisper(typingTool, "addPulseColor", {bot: arrowUp, startingColor: [79, 195, 247], endingColor: [3, 155, 229], initialZ: 0.05})
// }, 50)

// setTimeout(() => {
//     let arrowDown = create(ArrowDownConfig);
//     whisper(typingTool, "addPulseColor", {bot: arrowDown, startingColor: [79, 195, 247], endingColor: [3, 155, 229], initialZ: 0.05})
// }, 80)

setTimeout(() => {
    let arrowLeft = create(ArrowLeftConfig);
    whisper(typingTool, "addPulseColor", {bot: arrowLeft, startingColor: [79, 195, 247], endingColor: [3, 155, 229], initialZ: 0.05})
}, 110)

setTimeout(() => {
    let arrowRight = create(ArrowRightConfig);
    whisper(typingTool, "addPulseColor", {bot: arrowRight, startingColor: [79, 195, 247], endingColor: [3, 155, 229], initialZ: 0.05})
}, 140)

whisper(typingTool, "createDataSlits", {id: writenBot.tags.id, state: "time"});