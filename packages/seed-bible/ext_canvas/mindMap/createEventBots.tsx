const dim = os.getCurrentDimension();
const typingTool = getBot(byTag("typingTool"));
const timeBot = getBot(byTag("id", that.id));
const eventBots = getBots("eventBot");
destroy(eventBots);

const eventData = [
    {
        title: "event 1",
        description: "description 1",
        priority: false
    },
    {
        title: "event 2",
        description: "description 2",
        priority: false
    },
    {
        title: "event 3",
        description: "description 3",
        priority: false
    },
    {
        title: "event 4",
        description: "description 4",
        priority: false
    },
    {
        title: "event 5",
        description: "description 5",
        priority: true
    },
    {
        title: "event 6",
        description: "description 6",
        priority: false
    },
    {
        title: "event 7",
        description: "description 7",
        priority: false
    },
    {
        title: "event 8",
        description: "description 8",
        priority: false
    },
    {
        title: "event 9",
        description: "description 9",
        priority: false
    },
    {
        title: "event 10",
        description: "description 10",
        priority: false
    },
    {
        title: "event 11",
        description: "description 11",
        priority: false
    },
]

const eventBotConfig = {
    space: "tempLocal",
    [dim]: true,
    color: "#84FFFF",
    strokeWidth: 0.4,
    formOpacity: 0.2,
    eventBot: true,
    scaleX: 1.8,
    scaleY: 0.9,
    scaleZ: 0.1,
    labelOpacity: 0.6,
    labelFontSize: 1,
    onDrop: `@
        let dim = os.getCurrentDimension();
        if(that.to.x < tags.initPos.x + 4 && that.to.x > tags.initPos.x - 4 && that.to.y < tags.initPos.y + 4 && that.to.y > tags.initPos.y - 4){
            animateTag(thisBot, {
                fromValue: {
                    [dim + "X"]: thisBot.tags[dim + "X"],
                    [dim + "Y"]: thisBot.tags[dim + "Y"],
                },
                toValue: {
                    [dim + "X"]: tags.initPos.x,
                    [dim + "Y"]: tags.initPos.y,
                },
                duration: 0.2
            })
        }
    `,
    onClick: typingTool.tags.eventBotOnClick
}

for(let i = 0; i < eventData.length; i++){
    if(i % 2 === 0){
        create({
            ...eventBotConfig,
            [dim + "X"]: timeBot.tags[dim + "X"] - 1.1,
            [dim + "Y"]: timeBot.tags[dim + "Y"] - (i/2) - 1.5,
            label: eventData[i].title,
            formOpacity: i < 2 ? 0.3 : 0,
            labelOpacity: i < 2 ? 0.8 : 0,
            strokeColor: i < 2 ? "#40C4FF" : null,
            pointable: i < 2,
            index: i,
            initPos: {
                x: timeBot.tags[dim + "X"] - 1.1,
                y: timeBot.tags[dim + "Y"] - (i/2) - 1.5
            }
        })
    }else{
        create({
            ...eventBotConfig,
            [dim + "X"]: timeBot.tags[dim + "X"] + 1.1,
            [dim + "Y"]: timeBot.tags[dim + "Y"] - ((i + 1)/2) - 0.5,
            label: eventData[i].title,
            formOpacity: i < 2 ? 0.3 : 0,
            labelOpacity: i < 2 ? 0.8 : 0,
            strokeColor: i < 2 ? "#40C4FF" : null,
            pointable: i < 2,
            index: i,
            initPos: {
                x: timeBot.tags[dim + "X"] + 1.1,
                y: timeBot.tags[dim + "Y"] - ((i + 1)/2) - 0.5
            }
        })
    }
}