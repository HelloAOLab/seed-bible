let dim = os.getCurrentDimension();
const typingTool = getBot(byTag("typingTool"))
const clearBot = {
    [dim]: true,
    [dim + "X"]: that[dim + "X"] - 0.7,
    [dim + "Y"]: that[dim + "Y"] - 1,
    [dim + "Z"]: 0.05,
    scaleX: 0.7,
    scaleY: 0.7,
    scaleZ: 0.1,
    onClick: `@
        let controlBot = getBot(byTag("id", tags.controlBotId));
        whisper(thisBot, "callGPT", {text: controlBot.masks.label, self: true});
    `,
    callGPT: getBot('system', 'ext_canvas.aiChat').tags.aiOptionOnClick,
    labelOapcity: 1,
    formOpacity: 1,
    space: "tempLocal",
    color: "#29B6F6",
    controlBotId: that.id,
    removeButton: true,
    activeFormAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/40b6f4c1f711f7b4b51b40627175048a47859feee30f769b45aebc00fb5625d3.png",
    formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/91f8c0eed1609bb051a14951b94a61c1de486b8d17775e53b5471bc5b88cf51f.png",
    form: "sprite",
    draggable: false,
    onCreate: `@
        let buttonBots = getBots("removeButton");
        for(let i = 0; i < buttonBots.length; i++){
            if(buttonBots[i].tags.id !== tags.id){
                await clearInterval(buttonBots[i].masks.interval);
                await clearInterval(buttonBots[i].masks.interval2);
                destroy(buttonBots[i])
            }
        }
        const aiChat = getBot('system', 'ext_canvas.aiChat');
        if(aiChat?.masks?.crAction?.botId === tags.controlBotId && aiChat?.masks?.crAction.activeFormAddress === tags.activeFormAddress){
            let a = 0;
            let dim = os.getCurrentDimension()
            tags[dim + "RotationZ"] = 0;
            setTagMask(thisBot, "formAddress", thisBot.tags.activeFormAddress, "tempLocal");
            let interval = setInterval(() => {
                tags[dim + "RotationZ"] = Math.PI * a;
                a += 0.005
                if(a >= 2){
                    a = 0
                }
            }, 16);
            setTagMask(thisBot, "rotateInterval", interval, "tempLocal");
        }
    `,
    refID: 1
}

const button3Config = {
    [dim]: true,
    [dim + "X"]: that[dim + "X"] + 0.7,
    [dim + "Y"]: that[dim + "Y"] - 1,
    [dim + "Z"]: 0,
    scaleX: 0.7,
    scaleY: 0.7,
    scaleZ: 0.1,
    onClick: `@
        let controlBot = getBot(byTag("id", tags.controlBotId));
        whisper(thisBot, "callGPT", {text: controlBot.masks.label, self: true});
    `,
    callGPT: getBot('system', 'ext_canvas.aiChat').tags.genImageOnClick,
    labelOapcity: 1,
    formOpacity: 1,
    space: "tempLocal",
    color: "#039BE5",
    colorList: ["#4FC3F7", "#29B6F6", "#03A9F4", "#039BE5", "#0288D1"],
    controlBotId: that.id,
    button3: true,
    form: "sprite",
    activeFormAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/66651e431410544d92baa944e144e7969c8c27e906c1181eca8f4ce6f617d59a.png",
    formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/4292dc93c2d0668f7e713a0453db294e8242fc307c32061d26b7cefdfb4abd0e.png",
    formAddresses: [
        "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/78deda0fdb5436b4172b9b0db576d56d1575d7e76c7090054fd336513833344d.png",
        "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/02c2bddb71460d21167f1bba52da4db28f83334a25bf7925e3d6bf7fee1f5db5.png"
    ],
    draggable: false,
    onCreate: `@
        let buttonBots = getBots("button3");
        for(let i = 0; i < buttonBots.length; i++){
            if(buttonBots[i].tags.id !== tags.id){
                await clearInterval(buttonBots[i].masks.interval);
                await clearInterval(buttonBots[i].masks.interval2);
                destroy(buttonBots[i])
            }
        }
        const aiChat = getBot('system', 'ext_canvas.aiChat');
        if(aiChat?.masks?.crAction?.botId === tags.controlBotId && aiChat?.masks?.crAction.activeFormAddress === tags.activeFormAddress){
            let a = 0;
            let dim = os.getCurrentDimension()
            tags[dim + "RotationZ"] = 0;
            setTagMask(thisBot, "formAddress", thisBot.tags.activeFormAddress, "tempLocal");
            let interval = setInterval(() => {
                tags[dim + "RotationZ"] = Math.PI * a;
                a += 0.005
                if(a >= 2){
                    a = 0
                }
            }, 16);
            setTagMask(thisBot, "rotateInterval", interval, "tempLocal");
        }
    `,
    refID: 2
}

const searchBtnConfig = {
    [dim]: true,
    [dim + "X"]: that[dim + "X"] + 3,
    [dim + "Y"]: that[dim + "Y"] - 1,
    [dim + "Z"]: 0,
    scaleX: 0.7,
    scaleY: 0.7,
    scaleZ: 0.1,
    onClick: `@
    `,
    labelOapcity: 1,
    formOpacity: 1,
    space: "tempLocal",
    color: "#039BE5",
    colorList: ["#4FC3F7", "#29B6F6", "#03A9F4", "#039BE5", "#0288D1"],
    controlBotId: that.id,
    button4: true,
    form: "sprite",
    formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/4e49f09ffd1137119fcca077fafb4a99d284a69a31e12426228da859e43f52b2.png",
    draggable: false,
    onCreate: `@
        let buttonBots = getBots("button4");
        for(let i = 0; i < buttonBots.length; i++){
            if(buttonBots[i].tags.id !== tags.id){
                await clearInterval(buttonBots[i].masks.interval);
                await clearInterval(buttonBots[i].masks.interval2);
                destroy(buttonBots[i])
            }
        }
    `,
    onClick: `@
        const typingTool = getBot("system", "ext_canvas.mindMap")
        let controlBot = getBot(byID(tags.controlBotId));
        whisper(typingTool, "handleSearch", {query: controlBot.masks.label[0] === " " ? controlBot.masks.label.slice(1, controlBot.masks.label.length) : controlBot.masks.label, controlBotId: tags.controlBotId})
    `,
    onDestroy: `@
        if(masks.initiated){
            setBotId(null);
        }
    `,
    refID: 3
}

const deleteBot = {
    [dim]: true,
    [dim + "X"]: that[dim + "X"] + 2.1,
    [dim + "Y"]: that[dim + "Y"] - 1,
    [dim + "Z"]: 0.05,
    scaleX: 0.7,
    scaleY: 0.7,
    scaleZ: 0.1,
    onClick: `@
        const typingTool = getBot(byTag("typingTool"));
        let controlBot = getBot(byTag("id", tags.controlBotId));
        destroy(controlBot);
        whisper(typingTool, "removeMenuButtons");
        whisper(typingTool, "removeTLTools")
    `,
    labelOapcity: 1,
    formOpacity: 1,
    space: "tempLocal",
    color: "#03A9F4",
    controlBotId: that.id,
    button2: true,
    form: "sprite",
    formAddresses: [
        "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/bca0d0629b6845eae07cb078d7c1baeac7bed7adea935444195ffc69a6e5c83a.png",
        "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/4bbabccb38eeabffd47d8865d6a92c10207dd47b7e38fe9165372a6ca2c2bd8b.png"
    ],
    formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/bca0d0629b6845eae07cb078d7c1baeac7bed7adea935444195ffc69a6e5c83a.png",
    draggable: false,
    onCreate: `@
        let buttonBots = getBots("button2");
        for(let i = 0; i < buttonBots.length; i++){
            if(buttonBots[i].tags.id !== tags.id){
                await clearInterval(buttonBots[i].masks.interval);
                await clearInterval(buttonBots[i].masks.interval2);
                destroy(buttonBots[i])
            }
        }
    `
}

const aiSetting = {
    [dim]: true,
    [dim + "X"]: that[dim + "X"] + 2.1,
    [dim + "Y"]: that[dim + "Y"] - 1,
    [dim + "Z"]: 0.05,
    scaleX: 0.7,
    scaleY: 0.7,
    scaleZ: 0.1,
    onClick: `@
        shout("aiPromt")
    `,
    labelOapcity: 1,
    formOpacity: 1,
    space: "tempLocal",
    color: "#03A9F4",
    controlBotId: that.id,
    aiSetting: true,
    form: "sprite",
    formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/b7a7724dd759a3d768a13f56afb23ec2c9ab6f167c3226bc0f57924134ca9e96.png",
    draggable: false,
    onCreate: `@
        let aiSettingBots = getBots("aiSetting");
        for(let i = 0; i < aiSettingBots.length; i++){
            if(aiSettingBots[i].tags.id !== tags.id){
                await clearInterval(aiSettingBots[i].masks.interval);
                await clearInterval(aiSettingBots[i].masks.interval2);
                destroy(aiSettingBots[i])
            }
        }
    `
}

let clickSound = "\n await os.playSound('https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/f42ec34e8b5a29db9882a10d8a0c04f510c6cbbb7e9a56aa0ebb5f37343f1969.mpga')";

let options = [
    clearBot,
    button3Config
]

// let settingsBot = getBot('system', 'utils.settings');

// if(settingsBot.masks?.textMenuSettingConfig){
//     let tempOptions = [];
//     let menuSetting = [...JSON.parse(settingsBot.masks.textMenuSettingConfig)];
//     for(let setting of menuSetting){
//         for(let option of options){

//             if(setting.id === option.refID && setting.checked){
//                 tempOptions.push(option)
//             }
//         }
//     }
//     options = [...tempOptions]
// }

let settingsBot = getBot('system', 'app.components');

if(settingsBot.masks?.promtTools){
    let tempOptions = [];
    let menuSetting = [...settingsBot.masks?.promtTools];
    for(let setting of menuSetting){
        for(let option of options){
            if(setting.id === option.refID && setting.active){
                tempOptions.push(option)
            }
        }
    }
    options = [...tempOptions]
}

for(let i = 0; i < options.length; i++){
    let optionBot = create({
        ...options[i],
        [dim + "X"]: getBot(byID(that.id)).tags[dim + "X"] + (1 * i) - ((options.length / 2) - 0.6)
    })
    await os.sleep(30);
}