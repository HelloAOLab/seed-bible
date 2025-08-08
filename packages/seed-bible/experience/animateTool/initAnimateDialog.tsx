await os.unregisterApp('animationDialog');
await os.registerApp('animationDialog', thisBot);
const css = thisBot.tags["App.css"];
const active = thisBot.tags["active.css"];
const {useState, useEffect, useMemo, useCallback, useRef} = os.appHooks;
const axisArrow = getBot("axisArrow");
const circle = getBot("circle");

setTagMask(thisBot, "initiated", true, "tempLocal");

function generateQuery(params) {
    const queryArray = [];
    for (const key in params) {
        if (params.hasOwnProperty(key)) {
            queryArray.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
    }
    return queryArray.join('&');
}

function attachQueryToURL(url, params) {
    const queryString = generateQuery(params);
    return url + (url.includes('?') ? '&' : '?') + queryString;
}

setOpenSidebar(false);

const App = () => {
    const [currentCursor, setCurrentCursor] = useState("");
    const [currentMode, setCurrentMode] = useState("record");
    const [recording, setRecording] = useState(false);
    const [position, setPosition] = useState({x: "calc(100vw - 270px)", y: "20px"});
    const [selectedBot, setSelectedBot] = useState(null);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [frames, setFrames] = useState([]);
    const [formAnimations, setFormAnimations] = useState(null);
    const [btnDisable, setBtnDisable] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [lastPos, setLastPos] = useState(true);

    const axisArrowControl = (show, targetBot, forceShow, closeAxis) => {
        if(playing){
            return
        }
        if(show && (currentMode !== "record" || forceShow) && recording === false){
            const dim = os.getCurrentDimension();
            setTagMask(axisArrow, "scale", targetBot.tags?.scale ? targetBot.tags.scale + 1 : 2);
            setTagMask(axisArrow, `${[dim + "X"]}`, targetBot.tags[dim + "X"] + axisArrow.masks.scale * 0.475);
            setTagMask(axisArrow, `${[dim + "Y"]}`, targetBot.tags[dim + "Y"] + axisArrow.masks.scale * 0.475);
            setTagMask(axisArrow, `${[dim + "Z"]}`, targetBot.tags[dim + "Z"]);
            setTagMask(axisArrow, `${[dim]}`, true);
            setTagMask(axisArrow, `${[dim + "RotationZ"]}`, Math.PI);
            setTagMask(axisArrow, "formOpacity", 1);
        }else{
            setTagMask(axisArrow, "formOpacity", 0);
        }
        if(show && recording === false){
            const dim = os.getCurrentDimension();
            setTagMask(circle, "scale", targetBot.tags?.scale ? targetBot.tags.scale + 1 : 2);
            setTagMask(circle, `${[dim + "X"]}`, targetBot.tags[dim + "X"]);
            setTagMask(circle, `${[dim + "Y"]}`, targetBot.tags[dim + "Y"]);
            setTagMask(circle, `${[dim + "Z"]}`, targetBot.tags[dim + "Z"] - (targetBot.tags.scale * 2));
            setTagMask(circle, `${[dim]}`, true);
            setTagMask(circle, "formOpacity", 1);
            setTagMask(circle, "strokeColor", "#40C4FF");
        }else{
            setTagMask(circle, "formOpacity", 0);
            setTagMask(circle, "strokeColor", "transparent");
        }
        if(closeAxis){
            setTagMask(axisArrow, "formOpacity", 0);
        }
    }

    const animateBot = async (frame, selectedBot) => {
        setBtnDisable(true);
        axisArrowControl(false);
        await animationFunction.animateBot(selectedBot, frame)
        axisArrowControl(true, selectedBot);
        await os.stopFormAnimation(selectedBot);
        setBtnDisable(false);
    };

    const playAll = async (selectedBot, botFrames, repeat) => {
        setBtnDisable(true);
        axisArrowControl(false);
        animationFunction.setToInit(botFrames[0].initPos, selectedBot);
        for(let i = 0; i < botFrames.length; i++){
            setCurrentFrame(i);
            await animateBot(botFrames[i], selectedBot)
        }
        animationFunction.setToInit(botFrames[0].initPos, selectedBot);
        setCurrentFrame(0);
        axisArrowControl(true, selectedBot);
        await os.stopFormAnimation(selectedBot);
        setBtnDisable(false);
    }

    const saveFrame = (prevFrame: null) => {
        const dim = os.getCurrentDimension();
        axisArrowControl(false);
        let initPos;
        if(prevFrame){
            const prevFrameData = prevFrame ? JSON.parse(prevFrame[currentFrame]?.frameData) : null;
            const prevTags = prevFrameData ? prevFrameData.states[prevFrameData.states.length - 1].tags : null;
            initPos = {
                x: prevTags[dim + "X"],
                y: prevTags[dim + "Y"],
                z: frames[currentFrame].initPos.z + frames[currentFrame].z,
                scale: frames[currentFrame].scale,
                rX: frames[currentFrame].initPos.rX + frames[currentFrame].rX,
                rY: frames[currentFrame].initPos.rY + frames[currentFrame].rY,
                rZ: frames[currentFrame].initPos.rZ + frames[currentFrame].rZ,
            }
        }else{
            initPos = {
                x: frames[currentFrame].initPos.x + frames[currentFrame].x,
                y: frames[currentFrame].initPos.y + frames[currentFrame].y,
                z: frames[currentFrame].initPos.z + frames[currentFrame].z,
                scale: frames[currentFrame].scale,
                rX: frames[currentFrame].initPos.rX + frames[currentFrame].rX,
                rY: frames[currentFrame].initPos.rY + frames[currentFrame].rY,
                rZ: frames[currentFrame].initPos.rZ + frames[currentFrame].rZ,
            }
        }
        prevFrame ? setFrames([
            ...prevFrame,
            {
                x: 0,
                y: 0,
                z: 0,
                easing: "linear",
                scale: selectedBot.masks.scale ? selectedBot.masks.scale : selectedBot.tags.scale ? selectedBot.tags.scale : 1,
                rotations: 0,
                rotationAxis: "X",
                duration: 1,
                animation: null,
                type: "animation",
                rX: 0,
                rY: 0,
                rZ: 0,
                initPos
            }
        ]) : setFrames([
            ...frames,
            {
                x: 0,
                y: 0,
                z: 0,
                easing: "linear",
                scale: selectedBot.masks.scale ? selectedBot.masks.scale : selectedBot.tags.scale ? selectedBot.tags.scale : 1,
                rotations: 0,
                rotationAxis: "X",
                duration: 1,
                animation: null,
                type: "animation",
                rX: 0,
                rY: 0,
                rZ: 0,
                initPos
            }
        ]);
        animationFunction.setToInit(initPos, selectedBot);
        setCurrentFrame(frames.length);
        axisArrowControl(true, selectedBot);
    }

    const loadFrame = (e) => {
        axisArrowControl(false);
        const crFrame = parseInt(e.target.value);
        setCurrentFrame(crFrame);
        animationFunction.setToInit(frames[crFrame].initPos, selectedBot);
        axisArrowControl(true, selectedBot);
    }

    const reset = async () => {
        const dim = os.getCurrentDimension();
        if(selectedBot){
            setTagMask(selectedBot, "anchorPoint", "center");
            setTagMask(selectedBot, "scale", selectedBot.tags?.scale ? selectedBot.tags.scale : 1);
            setTagMask(selectedBot, "formAnimation", false);
            axisArrowControl(true, selectedBot);
            if(selectedBot.masks?.animationFrames){
                setFrames([...selectedBot.masks.animationFrames]);
                setCurrentFrame(0);
            }else{
                setCurrentFrame(0);
                setFrames([
                    {
                        x: 0,
                        y: 0,
                        z: 0,
                        easing: "linear",
                        scale: selectedBot.masks.scale ? selectedBot.masks.scale : selectedBot.tags.scale ? selectedBot.tags.scale : 1,
                        rotations: 0,
                        rotationAxis: "X",
                        animation: null,
                        duration: 1,
                        type: "animation",
                        rX: 0,
                        rY: 0,
                        rZ: 0,
                        initPos: {
                            x: selectedBot.tags[dim + "X"],
                            y: selectedBot.tags[dim + "Y"],
                            z: selectedBot.tags[dim + "Z"],
                            scale: selectedBot.tags.scale,
                            rX: 0,
                            rY: 0,
                            rZ: 0,
                        }
                    }
                ]);
            }
            const anis = await os.listFormAnimations(selectedBot);
            if(anis.length > 0){
                setFormAnimations([...anis]);
            }
        }else{
            setCurrentFrame(0);
            setFrames([
                {
                    x: 0,
                    y: 0,
                    z: 0,
                    easing: "linear",
                    scale: selectedBot.masks.scale ? selectedBot.masks.scale : selectedBot.tags.scale ? selectedBot.tags.scale : 1,
                    rotations: 0,
                    rotationAxis: "X",
                    animation: null,
                    duration: 1,
                    type: "animation",
                    rX: 0,
                    rY: 0,
                    rZ: 0,
                    initPos: {
                        x: selectedBot.tags[dim + "X"],
                        y: selectedBot.tags[dim + "Y"],
                        z: selectedBot.tags[dim + "Z"],
                        scale: selectedBot.tags.scale,
                        rX: 0,
                        rY: 0,
                        rZ: 0,
                    }
                }
            ]);
        }
    }

    const handleAnimationUpdate = (e, key) => {
        const tempFrames = frames;
        const value = parseFloat(e.target.value);
        if(value || value === 0){
            tempFrames[currentFrame][key] = value;
        }else{
            tempFrames[currentFrame][key] = e.target.value;
        }
        setFrames(tempFrames);
    }

    const done = () => {
        // clearTagMasks(selectedBot);
        selectedBot.masks.onDrag = null;
        selectedBot.masks.onDrop = null;
        selectedBot.masks.onDragging = null;
        selectedBot.masks.scale = null;
        selectedBot.masks.formAnimation = null;
        selectedBot.masks.anchorPoint = null;
        setSelectedBot(null);
        setTagMask(selectedBot, "animationFrames", frames);
        axisArrowControl(false);
    }

    const playAllBots = () => {
        setPlaying(!playing)
    }

    const publishAnimation = async () => {
        const dim = os.getCurrentDimension();
        setBtnDisable(true);
        const title = await os.showInput(null, {
            placeholder: 'Enter Animation Name'
        });
        if(title === null || title === ""){
            os.toast("Please enter a valid name");
            return
        }
        const aniBotTags = [];
        const animationBots = getBots("animationFrames");
        for(const animationBot of animationBots){
            aniBotTags.push({...animationBot.tags})
        }

        for(const aniConfig of aniBotTags){
            aniConfig.dimX = aniConfig[dim + "X"];
            aniConfig.dimY = aniConfig[dim + "Y"];
            aniConfig.dimZ = aniConfig[dim + "Z"];
            aniConfig.dimRotationX = aniConfig[dim + "RotationX"];
            aniConfig.dimRotationY = aniConfig[dim + "RotationY"];
            aniConfig.dimRotationZ = aniConfig[dim + "RotationZ"];
            destroy(aniConfig[dim]);
            destroy(aniConfig[dim + "X"]);
            destroy(aniConfig[dim + "Y"]);
            destroy(aniConfig[dim + "Z"]);
            destroy(aniConfig[dim + "RotationX"]);
            destroy(aniConfig[dim + "RotationY"]);
            destroy(aniConfig[dim + "RotationZ"]);
            const animationFrames = [...aniConfig.animationFrames];
            for(let j = 0; j < animationFrames.length; j++){
                if(animationFrames[j].type === "recording"){
                    const recording = JSON.parse(animationFrames[j].frameData);
                    for(let i = 0; i < recording.states.length; i++){
                        recording.states[i].tags.dimX = recording.states[i].tags[dim + "X"];
                        recording.states[i].tags.dimY = recording.states[i].tags[dim + "Y"];
                        destroy(recording.states[i].tags[dim + "X"])
                        destroy(recording.states[i].tags[dim + "Y"])
                    }
                    animationFrames[j].frameData = JSON.stringify(recording);
                }
            }
            aniConfig.animationFrames = [...animationFrames]
        }
        os.toast("Publishing animation")

        const body = JSON.stringify({
            animationBotConfigs: JSON.stringify(aniBotTags),
            animationName: title
        });

        const blob = new Blob([body], { type: 'text/plain' });

        const record = await os.recordFile("vRK2.YW5ub3RhdGlvblJlY29yZA==.WmptMWdDa1RLMFYvQlhQR2hKa3hhUT09.subjectfull", blob);

        const recordData = {
            recordAddress: record.url,
            recordName: "annotationRecord",
            animationName: title
        }

        const url = attachQueryToURL("https://theographic-bible-api.netlify.app/api/animation/addAnimation", recordData)
        
        const result = await web.get(url);

        if(result.status === 200){
            console.log(result);
            if(result.data.status === 200){
                os.toast(`Animation ${title} published successfully!`)
            }else{
                os.toast(result.data.data)
            }
        }else if(result.status !== 200){
            os.toast(result.data.data)
        }
        setBtnDisable(false);
    }

    const toggleMode = () => {
        setRecording(false)
        if(currentMode === "animation"){
            setCurrentMode("record")
            axisArrowControl(true, selectedBot, false, true);
        }else{
            setCurrentMode("animation");
            axisArrowControl(true, selectedBot, true);
        }
    }

    const removeFrame = async () => {
        if(currentFrame === 0 && frames.length === 1){
            await reset()
        }else if(currentFrame === 0 && frames.length > 1){
            setFrames([...animationFunction.removeFrame([...frames], currentFrame)]);
            loadFrame({target: {value: currentFrame}});
        }else{
            setFrames([...animationFunction.removeFrame([...frames], currentFrame)]);
            setCurrentFrame(currentFrame - 1);
            loadFrame({target: {value: currentFrame - 1}});
        }
    }

    useEffect(() => {
        const animationBots = getBots("animationFrames");
        if(playing){
            for(const animationBot of animationBots){
                playAll(animationBot, animationBot.masks.animationFrames, true)
            }
        }else{
            for(const animationBot of animationBots){
                clearAnimations(animationBot);
            }
        }
    }, [playing]);

    useEffect(() => {
        globalThis.selectedBot = selectedBot;
        globalThis.setSelectedBot = setSelectedBot;
        if(selectedBot){
            reset();
        }
        return () => {
            globalThis.selectedBot = null;
            globalThis.setSelectedBot = null;
        }
    },[selectedBot, setSelectedBot])

    useEffect(() => {
        globalThis.frames = frames;
        globalThis.setFrames = setFrames;
        globalThis.axisArrowControl = axisArrowControl;
        return () => {
            globalThis.frames = null;
            globalThis.setFrames = null;
            globalThis.axisArrowControl = null;
        }
    }, [frames, setFrames, axisArrowControl])

    useEffect(() => {
        thisBot.tags.onAnyBotClicked = `@
            if(globalThis?.selectedBot === null && !that.bot.tags.manager){
                globalThis.setSelectedBot(that.bot);
            }
        `;
        return () => {
            thisBot.tags.onAnyBotClicked = null;
        }
    }, [])

    useEffect(async () => {
        if(recording && currentMode === "record"){
            selectedBot.vars.states = [];
            selectedBot.vars.startTime = Date.now();
            os.toast("Recording!");
            setTagMask(selectedBot, "onDrag", `@
                os.enableCustomDragging();
            `, "tempLocal");
            setTagMask(selectedBot, "onDragging", `@
                const dim = os.getCurrentDimension();
                that.bot.masks[dim + 'X'] = that.to.x;
                that.bot.masks[dim + 'Y'] = that.to.y;
                thisBot.vars.states.push({
                    time: Date.now() - thisBot.vars.startTime,
                    id: thisBot.id,
                    tags: {
                        [dim + 'X']: that.to.x,
                        [dim + 'Y']: that.to.y,
                    }
                });
            `, "tempLocal");
            setBtnDisable(true);
        }else if(currentMode === "record" && selectedBot?.vars?.states?.length > 0 && !recording){
            const dim = os.getCurrentDimension();
            selectedBot.masks.onDrag = null;
            selectedBot.masks.onDragging = null;
            const frame = JSON.stringify({
                states: selectedBot.vars.states,
                startTime: selectedBot.vars.startTime
            });

            const tempFrames = [...frames];
            tempFrames[currentFrame] = {
                ...tempFrames[currentFrame],
                frameData: frame,
                type: "recording",
                initPos: {
                    ...tempFrames[currentFrame].initPos,
                    x: selectedBot.vars.states[0].tags[dim + "X"],
                    y: selectedBot.vars.states[0].tags[dim + "Y"],
                    z: selectedBot.tags[dim + "Z"],
                    scale: selectedBot.tags.scale
                }
            }
            selectedBot.vars.states = [];
            selectedBot.vars.startTime = Date.now();
            os.toast("Finished!");
            await os.sleep(300);
            os.toast("Saving Clip!");
            saveFrame(tempFrames);
            setBtnDisable(false);
        }
    }, [recording, currentMode])

    useEffect(() => {
        if(selectedBot && !recording && lastPos){
            setTagMask(selectedBot, "onDrop", `@
                animationFunction.displacedDiff(that.from, that.to)
            `, "tempLocal");
        }else if(selectedBot){
            setTagMask(selectedBot, "onDrop", `@
                if(selectedBot && globalThis.axisArrowControl){
                    globalThis.axisArrowControl(true, selectedBot)
                }
            `, "tempLocal");
        }
        return () => {
            if(selectedBot){
                selectedBot.masks.onDrop = null;
            }
        }
    }, [selectedBot, recording, lastPos])

    useEffect(() => {
        globalThis.annotInitialized = true;
        return () => {
            globalThis.annotInitialized = false;
        }
    }, [])
    
    return <>
        <style>{css}</style>
        <style>{active}</style>
        {
            currentCursor !== "" && <style>{currentCursor}</style>
        }
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        <div style={{left: `${position.x}`, top: `${position.y}`}} class="chaism-tools-container">
            <div class="dragTool" draggable={true} onDrag={e => {
                if(e.screenX !== 0 && e.screenY > 150){
                    setPosition({x: `${e.screenX + 150}px`, y: `${e.screenY - 110}px`})
                }
            }}>
                <span class="material-symbols-outlined">
                    more_horiz
                </span>
            </div>
            <div class="animate-container">
                {
                    selectedBot && frames.length > 0 && frames && <div class="animate-tool-container">
                        {
                            currentMode === "animation" && frames[currentFrame].type === "animation" && <>
                                <div class="animate-item">
                                    <span class="tool-title">Vector</span>
                                    <div class="sub-items">
                                        <div class="sub-item">
                                            <span class="sub-item-title" style={{color: "red"}}>X:</span>
                                            <input value={frames[currentFrame].x} onChange={e => handleAnimationUpdate(e, "x")} type="number" class="sub-item-input" />
                                        </div>
                                        <div class="sub-item">
                                            <span class="sub-item-title" style={{color: "blue"}}>Y:</span>
                                            <input value={frames[currentFrame].y} onChange={e => handleAnimationUpdate(e, "y")} type="number" class="sub-item-input" />
                                        </div>
                                        <div class="sub-item">
                                            <span class="sub-item-title" style={{color: "green"}}>Z:</span>
                                            <input value={frames[currentFrame].z} onChange={e => handleAnimationUpdate(e, "z")} type="number" class="sub-item-input" />
                                        </div>
                                    </div>
                                </div>
                                <div class="animate-item">
                                    <span class="tool-title">Rotation</span>
                                    <div class="sub-items">
                                        <div class="sub-item">
                                            <span class="sub-item-title" style={{color: "red"}}>rX:</span>
                                            <input value={frames[currentFrame].rX} onChange={e => handleAnimationUpdate(e, "rX")} type="number" class="sub-item-input" />
                                        </div>
                                        <div class="sub-item">
                                            <span class="sub-item-title" style={{color: "blue"}}>rY:</span>
                                            <input value={frames[currentFrame].rY} onChange={e => handleAnimationUpdate(e, "rY")} type="number" class="sub-item-input" />
                                        </div>
                                        <div class="sub-item">
                                            <span class="sub-item-title" style={{color: "green"}}>rZ:</span>
                                            <input value={frames[currentFrame].rZ} onChange={e => handleAnimationUpdate(e, "rZ")} type="number" class="sub-item-input" />
                                        </div>
                                    </div>
                                </div>
                                <div class="animate-item">
                                    <span class="tool-title">Easing</span>
                                    <select value={frames[currentFrame].easing} onChange={e => handleAnimationUpdate(e, "easing")} class="animate-input">
                                        <option value="linear">linear</option>
                                        <option value="quadratic">quadratic</option>
                                        <option value="cubic">cubic</option>
                                        <option value="quartic">quartic</option>
                                        <option value="quintic">quintic</option>
                                        <option value="sinusoidal">sinusoidal</option>
                                        <option value="exponential">exponential</option>
                                        <option value="circular">circular</option>
                                        <option value="elastic">elastic</option>
                                    </select>
                                </div>
                                <div class="animate-item">
                                    <span class="tool-title">Scale</span>
                                    <input value={frames[currentFrame].scale} onChange={e => handleAnimationUpdate(e, "scale")} type="number" class="animate-input" />
                                </div>
                                {formAnimations && formAnimations.length > 0 && <div class="animate-item">
                                    <span class="tool-title">Animations</span>
                                    <select onChange={async e => {
                                        handleAnimationUpdate(e, "animation")
                                        await os.startFormAnimation(selectedBot, e.target.value, {
                                            loop: {
                                                mode: 'repeat'
                                            }
                                        });
                                    }} class="animate-input">
                                        {
                                            formAnimations.map(item => {
                                                return <option value={item.name}>{item.name}</option>
                                            })
                                        }
                                    </select>
                                </div>}
                                <div class="animate-item">
                                    <span class="tool-title">Duration</span>
                                    <input value={frames[currentFrame].duration} onChange={e => handleAnimationUpdate(e, "duration")} type="number" class="animate-input" />
                                </div>
                            </>
                        }
                        {
                            currentMode === "animation" && frames[currentFrame].type === "recording" && <div class="animate-item">
                                    <span class="tool-title">Recording frame</span>
                                </div>
                        }
                        {
                            currentMode === "record" && <div class="animate-item">
                                <span class="tool-title">Recording Tool</span>
                                {
                                    frames[currentFrame].type !== "recording" && <button disabled={btnDisable && !recording} class="animate-btn" onClick={() => setRecording(!recording)}>{recording ? "Stop" : "Start"}</button>
                                }
                                {
                                    frames[currentFrame].type === "recording" && <span>Recording Saved</span>
                                }
                            </div>
                        }
                        <div class="animate-item">
                            <span class="tool-title">Toggle Mode</span>
                            <button disabled={btnDisable} class="animate-btn" onClick={toggleMode}>{currentMode === "record" ? "Animation" : "Record"}</button>
                        </div>
                        {frames.length > 0 && <div class="animate-item">
                            <span>Clip index: {currentFrame + 1}</span>
                            <input onChange={loadFrame} type="range" min={0} max={frames.length - 1} value={currentFrame} class="slider-input" id="myRange" />
                        </div>}
                        <div class="animate-item">
                            <button disabled={btnDisable} class="animate-btn" onClick={() => {saveFrame(frames[currentFrame].type === "recording" ? frames : null)}}>Add Animation</button>
                        </div>
                        <div class="animate-item">
                            <button disabled={btnDisable} class="animate-btn" onClick={() => {animateBot(frames[currentFrame], selectedBot)}}>Play</button>
                        </div>
                        {frames.length > 1 && <div class="animate-item">
                            <button disabled={btnDisable} class="animate-btn" onClick={() => playAll(selectedBot, frames)}>Play All</button>
                        </div>}
                        <div class="animate-item">
                            <button disabled={btnDisable} class="animate-btn" onClick={() => {setLastPos(!lastPos)}}>Last Pos : {lastPos ? "ON" : "OFF"}</button>
                        </div>
                        <div class="animate-item">
                            <button disabled={btnDisable} class="animate-btn" onClick={reset}>Reset</button>
                        </div>
                        <div class="animate-item">
                            <button disabled={btnDisable} class="animate-btn" onClick={done}>Done</button>
                        </div>
                        {frames.length > 0 && <div class="animate-item">
                            <button disabled={btnDisable} class="animate-btn" onClick={removeFrame}>Remove Clip</button>
                        </div>}
                    </div>
                }
                {
                    !selectedBot && <div class="animate-tool-container">
                        <span style={{fontWeight: "bold", fontSize: "16px", textAlign: "center"}}>
                            Please select a bot!
                        </span>
                        <span style={{fontWeight: "bold", fontSize: "16px", textAlign: "center"}}>or</span>
                        <button class="animate-btn" disabled={btnDisable} onClick={playAllBots}>{playing ? "Stop Animation" : "Play animation"}</button>
                        <button class="animate-btn" disabled={btnDisable} onClick={publishAnimation}>Publish</button>
                    </div>
                }
            </div>
        </div>
    </>
}
os.compileApp('animationDialog',<App />);