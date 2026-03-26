const dim = os.getCurrentDimension();

const lineColors = ["#FF4081", "#E040FB", "#7C4DFF", "#536DFE", "#448AFF", "#40C4FF", "#18FFFF", "#64FFDA", "#69F0AE"];
const controlBot = getBot(byTag("id", that.id));

const dataSlits = getBots(byTag("slitType"));
destroy(dataSlits);

await os.sleep(250);

let dataSlitsConfig = {
    space: "tempLocal",
    [dim]: true,
    [dim + "Y"]: controlBot.tags[dim + "Y"] - 1.5,
    [dim + "X"]: controlBot.tags[dim + "X"],
    [dim + "Z"]: controlBot.tags[dim + "Z"],
    formOpacity: 0,
    labelOpacity: 1,
    scaleX: 2,
    scaleY: 0.8,
    scaleZ: 0.1,
    label: "X A.D",
    dataSlit: true,
    draggable: false
}
let dataSlitLine = {
    space: "tempLocal",
    [dim]: true,
    [dim + "Y"]: controlBot.tags[dim + "Y"] - 2,
    [dim + "X"]: controlBot.tags[dim + "X"],
    [dim + "Z"]: controlBot.tags[dim + "Z"],
    formOpacity: 0.8,
    labelOpacity: 1,
    scaleX: 2,
    scaleY: 0.2,
    scaleZ: 0.1,
    dataSlitLine: true,
    draggable: false,
    color: "black",
    dataSlit: true
}

const ArrowDownConfig = {
    [dim]: true,
    [dim + "Z"]: 0.05,
    scaleX: 0.9,
    scaleY: 0.9,
    scaleZ: 0.1,
    labelOapcity: 1,
    formOpacity: 1,
    space: "tempLocal",
    color: "#29B6F6",
    arrowDown: true,
    formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/74d476df1e497eaf86dfd907973c5b02fbd41d173875004b34cc2a845e7307f2.png",
    form: "sprite",
    draggable: false,
    onCreate: `@
        let buttonBots = getBots("arrowDown");
        for(let i = 0; i < buttonBots.length; i++){
            if(buttonBots[i].tags.id !== tags.id){
                destroy(buttonBots[i])
            }
        }
    `,
    onClick: `@
        let dim = os.getCurrentDimension();
        if(!tags.collapsed){
            tags.collapsed = true;
            const eventTool = getBot('system', 'ext_canvas.eventTool');
            let eventBots = getBots("eventBot");
            let botsNum = eventBots.length;
            // moveEventBots(eventTool.tags.eventBotIds.indexOf(tags.mainEventBotId), 3 + botsNum - 1);
            for(let i = 0; i < eventBots.length; i++){
                setTimeout(() => {
                    eventBots[i].tags.formOpacity = 0.3
                    eventBots[i].tags.labelOpacity = 0.8
                    eventBots[i].tags.pointable = true
                    eventBots[i].tags.strokeColor = "#40C4FF"
                }, 500 * (eventBots[i].tags.index / eventBots.length))
            }
            await animateTag(thisBot, {
                fromValue: {
                    [dim + "Y"]: thisBot.tags[dim + "Y"]
                },
                toValue: {
                    [dim + "Y"]: thisBot.tags[dim + "Y"] - botsNum + 1
                },
                duration: 0.5
            })
            tags.formAddress = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/bc27b09bada43fa503425c81e70662458dd0579599ae7b87e6b809031e1b6d6f.png";
        }else{
            tags.collapsed = false;
            let eventBots = getBots("eventBot");
            let botsNum = eventBots.length;
            for(let i = 0; i < eventBots.length; i++){
                setTimeout(() => {
                    eventBots[i].tags.formOpacity = eventBots[i].tags.index < 1 ? 0.3 : 0
                    eventBots[i].tags.labelOpacity = eventBots[i].tags.index < 1 ? 0.8 : 0
                    eventBots[i].tags.pointable = eventBots[i].tags.index < 1
                    eventBots[i].tags.strokeColor = eventBots[i].tags.index < 1 ? "#40C4FF" : null
                }, 500 * ((eventBots.length - eventBots[i].tags.index) / eventBots.length))
            }
            animateTag(thisBot, {
                fromValue: {
                    [dim + "Y"]: thisBot.tags[dim + "Y"]
                },
                toValue: {
                    [dim + "Y"]: thisBot.tags[dim + "Y"] + botsNum - 1
                },
                duration: 0.5
            })
            const eventTool = getBot('system', 'ext_canvas.eventTool');
            // await moveEventBots(eventTool.tags.eventBotIds.indexOf(tags.mainEventBotId), 3);
            tags.formAddress = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/74d476df1e497eaf86dfd907973c5b02fbd41d173875004b34cc2a845e7307f2.png";
        }
    `,
    collapsed: false
}

globalThis.ArrowDownConfig = ArrowDownConfig;

const opacityCalc = (botPosition, parentPosition, initialOpacity) => {
    const distance = Math.sqrt((parentPosition - botPosition) * (parentPosition - botPosition));
    const opacity = initialOpacity * (1 - distance / 20);
    return opacity;
}

const priorityIndexFinder = () => {
    return 0;
}

const timeLineAndEventRetriver = (eventData) => {
    const timeLineEvents = {};
    for(let i = 0; i < eventData.length; i++){
        if(timeLineEvents[eventData[i].startDate]){
            timeLineEvents[eventData[i].startDate] = [...timeLineEvents[eventData[i].startDate], eventData[i]]
        }else{
            timeLineEvents[eventData[i].startDate] = [eventData[i]]
        }
    }
    let timeLine = [];
    const timeLineEventKeys = Object.keys(timeLineEvents);
    for(let key of timeLineEventKeys){
        timeLine.push({
            year: key,
            events: timeLineEvents[key].map(item => {
                return {
                    title: item.title,
                    description: item?.dictText ? item?.dictText.join("\n") : "",
                    eventData: item
                }
            }).sort((a,b) => a.eventData.sortKey - b.eventData.sortKey)
        })
    }
    timeLine = timeLine.sort((a,b) => {
        return a.events[0].eventData.sortKey - b.events[0].eventData.sortKey
    })
    return timeLine;
}

const timeLineEvents = [...timeLineAndEventRetriver(controlBot.tags.eventBotData.eventsHere)];

let priorityIndex = 0;
// if(tags.dataSlitsManager.selectedIndex){
//     priorityIndex = tags.dataSlitsManager.selectedIndex;
// }
let startingIndex = controlBot.tags[dim + "X"] - (priorityIndex * 4)
let dataSlitIds = [];
for(let i = 0; i < timeLineEvents.length; i++){
    let dataSlit = create({
        ...dataSlitsConfig,
        label: timeLineEvents[i].year,
        data: timeLineEvents[i],
        slitType: "time",
        scaleY: 0.8,
        labelFontSize: 1.2,
        eventData: timeLineEvents[i].events
    });
    let dataSlitLineBot = create({
        ...dataSlitLine,
        slitType: "time",
        scaleY: 0.2,
        color: lineColors[Math.floor(Math.random() * lineColors.length)]
    });
    dataSlit.tags.lineId = dataSlitLineBot.tags.id;
    dataSlitIds.push(dataSlit.tags.id);
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
        duration: 1,
    })
    animateTag(dataSlitLineBot, {
        fromValue: {
            [dim + "X"]: dataSlitLineBot.tags[dim + "X"],
            formOpacity: dataSlitLineBot.tags.formOpacity,
            labelOpacity: dataSlitLineBot.tags.labelOpacity,
            scaleX: dataSlitLineBot.tags.scaleX
        },
        toValue: {
            [dim + "X"]: startingIndex + i * 4,
            formOpacity: opacityCalc(startingIndex + i * 4, controlBot.tags[dim + "X"], 0.8),
            labelOpacity: opacityCalc(startingIndex + i * 4, controlBot.tags[dim + "X"], 1),
            scaleX: 4
        },
        duration: 1,
    })
    if(i === priorityIndex){
        setTimeout(() => {
            if(dataSlit.tags.eventData.length > 1){
                create({
                    ...ArrowDownConfig,
                    [dim + "X"]: startingIndex + i * 4,
                    [dim + "Y"]: dataSlit.tags[dim + "Y"] - 2.4,
                    controlBotId: dataSlit.tags.id,
                    mainEventBotId: that.id
                });
            }
            whisper(thisBot, "createEventBots", {id: dataSlit.tags.id})
        }, 1000)
    }
}
tags.dataSlitsManager.dataList = dataSlitIds;
tags.dataSlitsManager.selectedIndex = priorityIndex;
tags.dataSlitsManager.state = "time";
if(timeLineEvents.length > 1){
    whisper(thisBot, "createSlider", {id: controlBot.tags.id})
}else{
    await os.unregisterApp('slider')
}
