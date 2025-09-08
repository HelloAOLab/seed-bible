let dim = os.getCurrentDimension();
let controlBot = getBot(byTag("id", that.id));
await os.unregisterApp('slider')
await os.registerApp('slider', thisBot);

const { useEffect,useState, useRef } = os.appHooks;

let opacityCalc = (botPosition, parentPosition, initialOpacity) => {
    let distance = Math.sqrt((parentPosition - botPosition) * (parentPosition - botPosition));
    let opacity = initialOpacity * (1 - distance / 20);
    return opacity;
}

function App() {
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(tags.dataSlitsManager.dataList.length - 1);
    const [sliderValue, setSliderValue] = useState(tags.dataSlitsManager.selectedIndex);
    globalThis.setSliderValue = setSliderValue;
    const changePosition = (e) => {
        const eventTool = getBot('system', 'ext_canvas.eventTool');
        // moveEventBots(tags.eventBotIds.indexOf(that.id), 3);
        let priorityIndex = parseInt(e.target.value);
        let upArrow = getBots("arrowUp");
        let downArrow = getBots("arrowDown");
        let dataSlits = getBots(byTag("slitType", "incident"));
        let eventBots = getBots("eventBot");
        destroy(eventBots);
        destroy(upArrow);
        destroy(downArrow);
        destroy(dataSlits);
        let startingIndex = controlBot.tags[dim + "X"] - (priorityIndex * 4);
        for(let i = 0; i < tags.dataSlitsManager.dataList.length; i++){
            let dataSlit = getBot(byTag("id", tags.dataSlitsManager.dataList[i]));
            let dataSlitLine = getBot(byTag("id", dataSlit.tags.lineId));
            animateTag(dataSlit, {
                fromValue: {
                    [dim + "X"]: dataSlit.tags[dim + "X"],
                    formOpacity: dataSlit.tags.formOpacity,
                    labelOpacity: dataSlit.tags.labelOpacity,
                    scaleX: dataSlit.tags.scaleX
                },
                toValue: {
                    [dim + "X"]: startingIndex + i * 4,
                    formOpacity: opacityCalc(startingIndex + i * 4, controlBot.tags[dim + "X"], 0.8),
                    labelOpacity: opacityCalc(startingIndex + i * 4, controlBot.tags[dim + "X"], 1),
                    scaleX: 4
                },
                duration: 0.5,
            })
            animateTag(dataSlitLine, {
                fromValue: {
                    [dim + "X"]: dataSlitLine.tags[dim + "X"],
                    formOpacity: dataSlitLine.tags.formOpacity,
                    labelOpacity: dataSlitLine.tags.labelOpacity,
                    scaleX: dataSlitLine.tags.scaleX
                },
                toValue: {
                    [dim + "X"]: startingIndex + i * 4,
                    formOpacity: opacityCalc(startingIndex + i * 4, controlBot.tags[dim + "X"], 0.8),
                    labelOpacity: opacityCalc(startingIndex + i * 4, controlBot.tags[dim + "X"], 1),
                    scaleX: 4
                },
                duration: 0.5,
            })
            if(i === priorityIndex){
                setTimeout(() => {
                    if(dataSlit.tags.eventData.length > 1){
                        create({
                            ...globalThis.ArrowDownConfig,
                            [dim + "X"]: startingIndex + i * 4,
                            [dim + "Y"]: dataSlit.tags[dim + "Y"] - 2.4,
                            controlBotId: dataSlit.tags.id,
                            mainEventBotId: that.id
                        });
                    }
                    whisper(thisBot, "createEventBots", {id: dataSlit.tags.id})
                }, 500)
            }
        }
        tags.dataSlitsManager.selectedIndex = priorityIndex;
        setSliderValue(priorityIndex)
    }
    return (
        <>
        <style>{tags["Slider.css"]}</style>
        <div className='slider-main'>
            <div class="slide-container">
                <input onChange={e => changePosition(e)} type="range" min={min} max={max} value={sliderValue} class="slider-input" id="myRange" />
            </div>
        </div>
        </>
    );
}

function SimSlider() {
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(controlBot.tags.eventBotData.sims.length - 1);
    const [sliderValue, setSliderValue] = useState(0);
    globalThis.setSliderValue = setSliderValue;
    const changePosition = (e) => {
        let priorityIndex = parseInt(e.target.value);
        let upArrow = getBots("arrowUp");
        let downArrow = getBots("arrowDown");
        let dataSlits = getBots(byTag("slitType", "incident"));
        let eventBots = getBots("eventBot");
        destroy(eventBots);
        destroy(upArrow);
        destroy(downArrow);
        destroy(dataSlits);
        const masksKeys = Object.keys(controlBot.masks);
        for(let maskKey of masksKeys){
            if(maskKey !== "selectedEventBot" || maskKey !== "color" || maskKey !== ""){
                controlBot.masks[maskKey] = null;
            }
        }
        controlBot.tags.scaleX = null;
        controlBot.tags.scaleY = null;
        controlBot.tags.scaleZ = null;
        controlBot.tags.label = null;
        let simKeys = Object.keys(controlBot.tags.eventBotData.sims[priorityIndex]);
        for(let key of simKeys){
            setTagMask(controlBot, key, controlBot.tags.eventBotData.sims[priorityIndex][key], "tempLocal");
            if(key === "playSound"){
                controlBot.masks.onClick = `@
                    if(masks.soundId){
                        os.cancelSound(masks.soundId);
                        masks.soundId = null;
                        masks.label = "Play"
                        return
                    }
                    let id = os.playSound(masks.formAddress);
                    masks.soundId = id;
                    masks.label = "Stop";
                `
            }
        }
        setSliderValue(priorityIndex)
    }

    useEffect(() => {
        return () => {
            const masksKeys = Object.keys(controlBot.masks);
            for(let maskKey of masksKeys){
                if(maskKey !== "selectedEventBot" || maskKey !== "color" || maskKey !== ""){
                    controlBot.masks[maskKey] = null;
                }
            }
            controlBot.tags.scaleX = null;
            controlBot.tags.scaleY = null;
            controlBot.tags.scaleZ = null;
            controlBot.tags.label = null;
            let simKeys = Object.keys(controlBot.tags.eventBotData.sims[0]);
            for(let key of simKeys){
                setTagMask(controlBot, key, controlBot.tags.eventBotData.sims[0][key], "tempLocal");
                if(key === "playSound"){
                    controlBot.masks.onClick = `@
                        if(masks.soundId){
                            os.cancelSound(masks.soundId);
                            masks.soundId = null;
                            masks.label = "Play"
                            return
                        }
                        let id = os.playSound(masks.formAddress);
                        masks.soundId = id;
                        masks.label = "Stop";
                    `
                }
            }
        }
    },[])
    return (
        <>
        <style>{tags["Slider.css"]}</style>
        <div className='slider-main'>
            <div class="slide-container">
                <input onChange={e => changePosition(e)} type="range" min={min} max={max} value={sliderValue} class="slider-input" id="myRange" />
            </div>
        </div>
        </>
    );
}

if(controlBot.tags.eventBotType === "sim"){
    os.compileApp('slider',<SimSlider />)
}else{
    os.compileApp('slider',<App />)
}