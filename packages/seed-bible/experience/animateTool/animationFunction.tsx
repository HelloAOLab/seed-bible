const animateBot = async (selectedBot, frame) => {
    const dim = os.getCurrentDimension();
    if(frame?.type === "recording"){
        const recording = JSON.parse(frame.frameData);
        try{
            if (recording) {
                const startTime = Date.now();
                let hadState = false;
                const states = recording.states;
                let interval = setInterval(() => {
                    const currentTime = Date.now() - startTime;
                    const state = states.find(s => s.time >= currentTime)
                    if (state) {
                        hadState = true;
                        const b = getBot(byID(state.id));
                        for(const tag in state.tags) {
                            b.masks[tag] = state.tags[tag];
                        }
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

const removeFrame = (frames, index) => {
    console.log(frames);
    const dim = os.getCurrentDimension();
    let tempFrames = [...frames];
    const removedFrame = tempFrames.splice(index, 1);
    try{
        if(removedFrame[0].type === "recording"){
            const frameData = JSON.parse(removedFrame[0].frameData);
            const initPos = frameData.states[0].tags;
            const finalPos = frameData.states[frameData.states.length - 1].tags;
            const diff = {
                x: initPos[dim + "X"] - finalPos[dim + "X"],
                y: initPos[dim + "Y"] - finalPos[dim + "Y"],
            }
            // for(let i = index; i < tempFrames.length; i++){
            //     console.log(tempFrames[i], i, diff)
            //     tempFrames[i].initPos.x -= diff.x;
            //     tempFrames[i].initPos.y -= diff.y;
            //     console.log(tempFrames[i], i,  tempFrames[i].initPos.x - diff.x, tempFrames[i].initPos.y - diff.y)
            // }
            tempFrames = tempFrames.map((item, fIndex) => {
                const x = item;
                if(fIndex >= index){
                    console.log(x.initPos);
                    x.initPos.x = x.initPos.x + diff.x;
                    x.initPos.y = x.initPos.y + diff.y;
                    console.log(x.initPos);
                }
                return x
            })
        }else if(removedFrame[0].type === "animation"){
            for(let i = index; i < tempFrames.length; i++){
                tempFrames[i].initPos.x = tempFrames[i].initPos.x - removedFrame[0].x;
                tempFrames[i].initPos.y = tempFrames[i].initPos.y - removedFrame[0].y; 
                tempFrames[i].initPos.z = tempFrames[i].initPos.z - removedFrame[0].z; 
                tempFrames[i].initPos.rX = tempFrames[i].initPos.rX - removedFrame[0].rX; 
                tempFrames[i].initPos.rY = tempFrames[i].initPos.rY - removedFrame[0].rY; 
                tempFrames[i].initPos.rZ = tempFrames[i].initPos.rZ - removedFrame[0].rZ;
            }
        }
    }catch(e){
        console.log(e)
    }
    console.log(tempFrames)
    return [...tempFrames]
}

const displacedDiff = (from, to) => {
    const diff = {
        x: from.x - to.x,
        y: from.y - to.y,
    }
    const dim = os.getCurrentDimension();
    const tempFrames = [...globalThis.frames];
    for(let i = 0; i < tempFrames.length; i++){
        if(tempFrames[i].type === "recording"){
            const frameData = JSON.parse(tempFrames[i].frameData);
            for(let j = 0; j < frameData.states.length; j++){
                frameData.states[j].tags[dim + "X"] = frameData.states[j].tags[dim + "X"] - diff.x;
                frameData.states[j].tags[dim + "Y"] = frameData.states[j].tags[dim + "Y"] - diff.y;
            }
            tempFrames[i].frameData = JSON.stringify(frameData);
        }
        tempFrames[i].initPos.x = tempFrames[i].initPos.x - diff.x;
        tempFrames[i].initPos.y = tempFrames[i].initPos.y - diff.y;
    }
    globalThis.setFrames([...tempFrames]);
    globalThis.axisArrowControl(true, selectedBot)
}

globalThis.animationFunction = {
    animateBot,
    setToInit,
    removeFrame,
    displacedDiff
}