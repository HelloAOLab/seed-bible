const setToInit = (initConfig, selectedBot) => {
    const dim = os.getCurrentDimension();
    setTagMask(selectedBot, `${[dim + "X"]}`, initConfig.x);
    setTagMask(selectedBot, `${[dim + "Y"]}`, initConfig.y);
    setTagMask(selectedBot, `${[dim + "Z"]}`, initConfig.z);
    setTagMask(selectedBot, `${[dim + "RotationX"]}`, Math.PI * 2 * initConfig.rX);
    setTagMask(selectedBot, `${[dim + "RotationY"]}`, Math.PI * 2 * initConfig.rY);
    setTagMask(selectedBot, `${[dim + "RotationZ"]}`, Math.PI * 2 * initConfig.rZ);
    setTagMask(selectedBot, `scale`, initConfig.scale);
}

const animateBot = async (selectedBot, frame) => {
    const dim = os.getCurrentDimension();
    if(frame?.type === "recording"){
        const recording = JSON.parse(frame.frameData);
        try{
            if (recording) {
                let startTime = Date.now();
                let hadState = false;
                let states = recording.states;
                let interval = setInterval(() => {
                    let currentTime = Date.now() - startTime;
                    let state = states.find(s => s.time >= currentTime)
                    if (state) {
                        hadState = true;
                        const b = getBot(byID(state.id));
                        // for(let tag in state.tags) {
                        //     b.masks[tag] = state.tags[tag];
                        // }
                        b.masks[dim + "X"] = state.tags[dim + "X"];
                        b.masks[dim + "Y"] = state.tags[dim + "Y"];
                    } else if (hadState) {
                        clearInterval(interval);
                        interval = null;
                    }
                }, 10);
                while(interval){
                    await os.sleep(100)
                }
            }
        }catch{

        }
    }else{
        setToInit(frame.initPos, selectedBot);
        frame.animation && os.startFormAnimation(selectedBot, frame.animation, {
            loop: {
                mode: 'repeat'
            }
        });
        frame.animation && os.startFormAnimation(selectedBot, frame.animation, {
            loop: {
                mode: 'repeat'
            }
        });
        if(frame.duration > 0){
            await animateTag(selectedBot, {
                fromValue: {
                    [dim + "X"]: selectedBot.tags[dim + "X"],
                    [dim + "Y"]: selectedBot.tags[dim + "Y"],
                    [dim + "Z"]: selectedBot.tags[dim + "Z"],
                    [dim + "RotationX"]: frame.initPos.rX,
                    [dim + "RotationY"]: frame.initPos.rY,
                    [dim + "RotationZ"]: frame.initPos.rZ,
                    scale: selectedBot.tags?.scale,
                },
                toValue: {
                    [dim + "X"]: selectedBot.tags[dim + "X"] + frame.x,
                    [dim + "Y"]: selectedBot.tags[dim + "Y"] + frame.y,
                    [dim + "Z"]: selectedBot.tags[dim + "Z"] + frame.z,
                    [dim + "RotationX"]: Math.PI * 2 * frame.initPos.rX + Math.PI * 2 * frame.rX,
                    [dim + "RotationY"]: Math.PI * 2 * frame.initPos.rY + Math.PI * 2 * frame.rY,
                    [dim + "RotationZ"]: Math.PI * 2 * frame.initPos.rZ + Math.PI * 2 * frame.rZ,
                    scale: frame.scale
                },
                duration: frame.duration,
                easing: frame.easing
            });
        }else{
            selectedBot.tags[dim + "X"] = selectedBot.tags[dim + "X"] + frame.x;
            selectedBot.tags[dim + "Y"] = selectedBot.tags[dim + "Y"] + frame.y;
            selectedBot.tags[dim + "Z"] = selectedBot.tags[dim + "Z"] + frame.z;
            selectedBot.tags[dim + "RotationX"] = Math.PI * 2 * frame.initPos.rX + Math.PI * 2 * frame.rX;
            selectedBot.tags[dim + "RotationY"] = Math.PI * 2 * frame.initPos.rY + Math.PI * 2 * frame.rY;
            selectedBot.tags[dim + "RotationZ"] = Math.PI * 2 * frame.initPos.rZ + Math.PI * 2 * frame.rZ;
            selectedBot.tags.scale = frame.scale;
        }
    }
    await os.stopFormAnimation(selectedBot);
};

const playAll = async (selectedBot, botFrames, repeat) => {
    setToInit(botFrames[0].initPos, selectedBot);
    for(let i = 0; i < botFrames.length; i++){
        await animateBot(selectedBot, botFrames[i])
    }
    setToInit(botFrames[0].initPos, selectedBot);
    await os.stopFormAnimation(selectedBot);
}

const animationBots = getBots("animationName", that.animationName);

for(let animationBot of animationBots){
    playAll(animationBot, animationBot.tags.animationFrames, true)
}