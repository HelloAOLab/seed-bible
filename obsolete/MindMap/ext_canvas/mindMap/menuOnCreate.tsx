let dim = os.getCurrentDimension();
whisper(thisBot, "removeMenuButtons");
whisper(thisBot, "removeTLTools");
let lineColors = [
  "#FF4081",
  "#E040FB",
  "#7C4DFF",
  "#536DFE",
  "#448AFF",
  "#40C4FF",
  "#18FFFF",
  "#64FFDA",
  "#69F0AE",
];
let botColors = [
  "#FCE4EC",
  "#F3E5F5",
  "#EDE7F6",
  "#E8EAF6",
  "#E3F2FD",
  "#E1F5FE",
  "#E0F7FA",
  "#E0F2F1",
  "#E8F5E9",
];
const typingTool = getBot(byTag("typingTool"));
let controlBot = getBot(byTag("id", that.id));
let controlIndexBot = getBot(byTag("id", controlBot.tags.indexBot));
let strokeBots = getBots(byTag("strokeColor"));
let currentWritingBots = getBots(byTag("currentWriter", tags.id));
for (let i = 0; i < strokeBots.length; i++) {
  strokeBots[i].masks.strokeColor = null;
  strokeBots[i].masks.color = null;
  strokeBots[i].tags.strokeColor = null;
  strokeBots[i].tags.color = null;
  let strokeIndexBot = getBot(byTag("id", strokeBots[i].tags.indexBot));
  strokeIndexBot.masks.strokeColor = null;
  strokeIndexBot.masks.color = null;
}
for (let bot of currentWritingBots) {
  bot.masks.currentWriter = null;
  bot.masks.name = null;
}
let currentNumber = Math.floor(Math.random() * lineColors.length);
let currentColor = lineColors[currentNumber];
let userBot = getBot(byTag("userInfoBot"), byTag("space", "tempShared"));
setTagMask(controlBot, "strokeColor", lineColors[currentNumber], "shared");
setTagMask(controlBot, "color", botColors[currentNumber], "shared");
setTagMask(controlIndexBot, "strokeColor", lineColors[currentNumber], "shared");
setTagMask(controlIndexBot, "color", botColors[currentNumber], "shared");
setTagMask(controlIndexBot, "color", botColors[currentNumber], "shared");
setTagMask(controlBot, "currentWriter", tags.id, "shared");
// setTagMask(controlBot, "name", userBot.tags.name, "shared");

animateTag(controlBot, {
  fromValue: {
    formOpacity: 0.7,
  },
  toValue: {
    formOpacity: controlBot.masks.formOpacity,
  },
  duration: 0.2,
  tagMaskSpace: "tempLocal",
});

animateTag(controlIndexBot, {
  fromValue: {
    formOpacity: 0.7,
  },
  toValue: {
    formOpacity: controlBot.masks.formOpacity,
  },
  duration: 0.2,
  tagMaskSpace: "tempLocal",
});

if (that.textBot) {
  if (controlBot.tags.state === "text") {
    if (controlBot.tags.parentTextBar) {
      whisper(typingTool, "createTextBoxMenu", {
        [dim + "X"]: controlBot.tags[dim + "X"],
        [dim + "Y"]: controlBot.tags[dim + "Y"] - 0.4,
        id: controlBot.tags.id,
      });
    } else {
      whisper(typingTool, "createTextBoxMenu", {
        [dim + "X"]: controlBot.tags[dim + "X"],
        [dim + "Y"]: controlBot.tags[dim + "Y"],
        id: controlBot.tags.id,
      });
    }
  }
  return;
}

const removeButtonConfig = {
  [dim]: true,
  [dim + "X"]: that[dim + "X"] - 2.9,
  [dim + "Y"]: that[dim + "Y"] - 1,
  [dim + "Z"]: 0.1,
  scaleX: 0.7,
  scaleY: 0.7,
  scaleZ: 0.1,
  onClick: typingTool.tags.menuRemoteOnClick,
  labelOapcity: 1,
  formOpacity: 1,
  space: "tempLocal",
  color: "#29B6F6",
  controlBotId: that.id,
  removeButton: true,
  formAddress:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/f901c10afe3f00386b0b75a61ed6d41409e252e7ed20500f5034abef04488b1e.png",
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
    `,
  refID: 1,
};

const button2Config = {
  [dim]: true,
  [dim + "X"]: that[dim + "X"] - 1.7,
  [dim + "Y"]: that[dim + "Y"] - 1,
  [dim + "Z"]: 0.1,
  scaleX: 0.7,
  scaleY: 0.7,
  scaleZ: 0.1,
  onClick: `@
        let controlBot = getBot(byTag("id", tags.controlBotId));
        whisper(thisBot, "callGPT", {text: controlBot.masks.label});
    `,
  callGPT: getBot("system", "ext_canvas.aiChat").tags.aiOptionOnClick,
  labelOapcity: 1,
  formOpacity: 1,
  space: "tempLocal",
  color: "#03A9F4",
  controlBotId: that.id,
  button2: true,
  form: "sprite",
  activeFormAddress:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/40b6f4c1f711f7b4b51b40627175048a47859feee30f769b45aebc00fb5625d3.png",
  formAddress:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/91f8c0eed1609bb051a14951b94a61c1de486b8d17775e53b5471bc5b88cf51f.png",
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
  chatGptBot: true,
  controlBotId: controlBot.tags.id,
  refID: 2,
};

const button3Config = {
  [dim]: true,
  [dim + "X"]: that[dim + "X"] - 0.5,
  [dim + "Y"]: that[dim + "Y"] - 1,
  [dim + "Z"]: 0,
  scaleX: 0.7,
  scaleY: 0.7,
  scaleZ: 0.1,
  onClick: `@
        let controlBot = getBot(byTag("id", tags.controlBotId));
        whisper(thisBot, "callGPT", {text: controlBot.masks.label});
    `,
  callGPT: getBot("system", "ext_canvas.aiChat").tags.genImageOnClick,
  labelOapcity: 1,
  formOpacity: 1,
  space: "tempLocal",
  color: "#039BE5",
  colorList: ["#4FC3F7", "#29B6F6", "#03A9F4", "#039BE5", "#0288D1"],
  controlBotId: that.id,
  button3: true,
  form: "sprite",
  formAddress:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/4292dc93c2d0668f7e713a0453db294e8242fc307c32061d26b7cefdfb4abd0e.png",
  activeFormAddress:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/66651e431410544d92baa944e144e7969c8c27e906c1181eca8f4ce6f617d59a.png",
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
  refID: 3,
};

const deleteButtonConfig = {
  [dim]: true,
  [dim + "X"]: that[dim + "X"] + 1.9,
  [dim + "Y"]: that[dim + "Y"] - 1,
  [dim + "Z"]: 0,
  scaleX: 0.7,
  scaleY: 0.7,
  scaleZ: 0.1,
  onClick: typingTool.tags.deleteOnClick,
  labelOapcity: 1,
  formOpacity: 1,
  space: "tempLocal",
  color: "#0288D1",
  controlBotId: that.id,
  deleteButton: true,
  form: "sprite",
  formAddress:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/bca0d0629b6845eae07cb078d7c1baeac7bed7adea935444195ffc69a6e5c83a.png",
  draggable: false,
  onCreate: `@
        let buttonBots = getBots("deleteButton");
        for(let i = 0; i < buttonBots.length; i++){
            if(buttonBots[i].tags.id !== tags.id){
                await clearInterval(buttonBots[i].masks.interval);
                await clearInterval(buttonBots[i].masks.interval2);
                destroy(buttonBots[i])
            }
        }
    `,
  refID: 4,
};

const shareButtonConfig = {
  [dim]: true,
  [dim + "X"]: that[dim + "X"] + 0.7,
  [dim + "Y"]: that[dim + "Y"] - 1,
  [dim + "Z"]: 0,
  scaleX: 0.7,
  scaleY: 0.7,
  scaleZ: 0.1,
  labelOapcity: 1,
  formOpacity: 1,
  space: "tempLocal",
  color: "#0288D1",
  controlBotId: that.id,
  shareButton: true,
  form: "sprite",
  formAddress:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/efa91c7284144b4c18492829fd6c22b70d30f8efbc536b4e195c1d36e525b41c.png",
  draggable: false,
  activeFormAddress:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/e0c0866fa29460586e43849f78a27a765429362f992336fa86b561fab7c4b0ef.png",
  playIcon:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/3665ec87031b8dba497f9c6f1c09170304237250566d461233b8fb4c9c2262f6.png",
  stopIcon:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/eda10bc0e9c03da78005bd6bf1ea2c4086adebd6031fb8da7a4b3bc7c8f936cf.png",
  onCreate: `@
        let buttonBots = getBots("shareButton");
        for(let i = 0; i < buttonBots.length; i++){
            if(buttonBots[i].tags.id !== tags.id){
                await clearInterval(buttonBots[i].masks.interval);
                await clearInterval(buttonBots[i].masks.interval2);
                destroy(buttonBots[i])
            }
        }
        let controlBot = getBot(byID(tags.controlBotId));
        if((controlBot.masks.voiceNote || controlBot.tags.voiceNote)){
            thisBot.masks.formAddress = thisBot.tags.playIcon;
        }
    `,
  onPointerDown: `@
        if(thisBot.masks.playingId){
            return
        }
        const recordTimeout = setTimeout(async () => {
            thisBot.masks.formAddress = thisBot.tags.activeFormAddress;
            thisBot.masks.recordTimeout = null;
            thisBot.masks.recording = true;
            os.toast("Recording Voicenote");
            await os.beginAudioRecording();
        }, 500);
        setTagMask(thisBot, "recordTimeout", recordTimeout, "tempLocal")
    `,
  onPointerUp: `@
        if(thisBot.masks.playingId){
            return
        }
        if(thisBot.masks.recordTimeout){
            clearTimeout(thisBot.masks.recordTimeout);
            thisBot.masks.recordTimeout = null
        }else{
            const data = await os.endAudioRecording();
            data.arrayBuffer().then(buffer => {
                const base64 = bytes.toBase64Url(new Uint8Array(buffer), data.type.split(";")[0]);
                let controlBot = getBot(byID(tags.controlBotId));
                setTagMask(controlBot, "voiceNote", base64, "tempLocal");
                thisBot.masks.formAddress = thisBot.tags.playIcon;
                setTimeout(() => {
                    thisBot.masks.recording = false;
                }, 200)
                os.toast("Voicenote Saved");
            })
        }
    `,
  onClick: `@
                let controlBot = getBot(byID(tags.controlBotId));
                if((controlBot.masks.voiceNote || controlBot.tags.voiceNote) && !thisBot.masks.recording){
                    if(!thisBot.masks.playingId){
                        os.toast("Playing Voicenote");
                        os.log("Playing");
                        const id = await os.playSound((controlBot.masks.voiceNote || controlBot.tags.voiceNote));
                        thisBot.masks.formAddress = thisBot.tags.stopIcon;
                        thisBot.masks.playingId = id;
                    }else{
                        os.log("Stoping");
                        os.cancelSound(thisBot.masks.playingId);
                        thisBot.masks.playingId = null;
                        thisBot.masks.formAddress = thisBot.tags.playIcon;
                    }
                }
            `,
  refID: 5,
};

let clickSound =
  "\n await os.playSound('https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/f42ec34e8b5a29db9882a10d8a0c04f510c6cbbb7e9a56aa0ebb5f37343f1969.mpga')";

let options = [
  removeButtonConfig,
  button2Config,
  button3Config,
  shareButtonConfig,
  deleteButtonConfig,
];

let settingsBot = getBot("system", "app.components");

if (settingsBot.masks?.mindmapTools) {
  let tempOptions = [];
  let menuSetting = [...settingsBot.masks?.mindmapTools];
  for (let setting of menuSetting) {
    for (let option of options) {
      if (setting.id === option.refID && setting.active) {
        tempOptions.push(option);
      }
    }
  }
  options = [...tempOptions];
}

for (let i = 0; i < options.length; i++) {
  let optionBot = create({
    ...options[i],
    [dim + "X"]:
      getBot(byID(that.id)).tags[dim + "X"] + 1 * i - options.length / 2,
  });
  await os.sleep(30);
}

// setTimeout(() => {
//     let removeButton = create(removeButtonConfig);
//     removeButton.tags.onClick += clickSound;
//     whisper(typingTool, "addPulseColor", {bot: removeButton, startingColor: [79, 195, 247], endingColor: [3, 155, 229], initialZ: 0.05})
// }, 50)

// setTimeout(() => {
//     let button2 = create(button2Config);
//     button2.tags.onClick += `\n await os.playSound("https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/75468a6b7d93ebca539077adfd9cf676071294dbfc92651b446d1ce39e64dd33.mpga")`;
//     whisper(typingTool, "addPulseColor", {bot: button2, startingColor: [79, 195, 247], endingColor: [3, 155, 229], initialZ: 0.05})
// }, 80)

// setTimeout(() => {
//     let button3 = create(button3Config);
//     button3.tags.onClick += `\n await os.playSound("https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/c09a0209e156afa113f90fe0b6c6635253572af3725c69408bf69f4d730c6091.mpga")`;
//     whisper(typingTool, "addPulseColor", {bot: button3, startingColor: [79, 195, 247], endingColor: [3, 155, 229], initialZ: 0.05})
// }, 120)

// setTimeout(() => {
//     let deleteButton = create(deleteButtonConfig);
//     deleteButton.tags.onClick += clickSound;
//     whisper(typingTool, "addPulseColor", {bot: deleteButton, startingColor: [79, 195, 247], endingColor: [3, 155, 229], initialZ: 0.05})
// }, 150)

// setTimeout(() => {
//     let shareButton = create(shareButtonConfig);
//     shareButton.tags.onClick += `\n await os.playSound("https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/c09a0209e156afa113f90fe0b6c6635253572af3725c69408bf69f4d730c6091.mpga")`
//     whisper(typingTool, "addPulseColor", {bot: shareButton, startingColor: [79, 195, 247], endingColor: [3, 155, 229], initialZ: 0.05})
// }, 180)
