let dim = os.getCurrentDimension();
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
let controlBot = getBot(byTag("id", that.id));
const typingTool = getBot(byTag("typingTool"));
let dataSlits = getBots(byTag("slitType", that.state));
destroy(dataSlits);
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
  draggable: false,
};
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
  dataSlit: true,
};

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
  formAddress:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/74d476df1e497eaf86dfd907973c5b02fbd41d173875004b34cc2a845e7307f2.png",
  form: "sprite",
  draggable: false,
  onCreate: `@
        let buttonBots = getBots("arrowDown");
        for(let i = 0; i < buttonBots.length; i++){
            if(buttonBots[i].tags.id !== tags.id){
                await clearInterval(buttonBots[i].masks.interval);
                await clearInterval(buttonBots[i].masks.interval2);
                destroy(buttonBots[i])
            }
        }
    `,
  onClick: `@
        let dim = os.getCurrentDimension();
        const typingTool = getBot(byTag("typingTool"));
        let timeBot = getBot(byTag("id", tags.controlBotId));
        if(!tags.collapsed){
            tags.collapsed = true;
            let eventBots = getBots("eventBot");
            let botsNum = eventBots.length % 2 === 0 ? eventBots.length / 2 : (eventBots.length + 1) / 2;
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
            let botsNum = eventBots.length % 2 === 0 ? eventBots.length / 2 : (eventBots.length + 1) / 2;
            for(let i = 0; i < eventBots.length; i++){
                setTimeout(() => {
                    eventBots[i].tags.formOpacity = eventBots[i].tags.index < 2 ? 0.3 : 0
                    eventBots[i].tags.labelOpacity = eventBots[i].tags.index < 2 ? 0.8 : 0
                    eventBots[i].tags.pointable = eventBots[i].tags.index < 2
                    eventBots[i].tags.strokeColor = eventBots[i].tags.index < 2 ? "#40C4FF" : null
                }, 500 * ((eventBots.length - eventBots[i].tags.index) / eventBots.length))
            }
            await animateTag(thisBot, {
                fromValue: {
                    [dim + "Y"]: thisBot.tags[dim + "Y"]
                },
                toValue: {
                    [dim + "Y"]: thisBot.tags[dim + "Y"] + botsNum - 1
                },
                duration: 0.5
            })
            tags.formAddress = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/74d476df1e497eaf86dfd907973c5b02fbd41d173875004b34cc2a845e7307f2.png";
        }
    `,
  collapsed: false,
};

let opacityCalc = (botPosition: any, parentPosition: any, initialOpacity) => {
  let distance = Math.sqrt(
    (parentPosition - botPosition) * (parentPosition - botPosition)
  );
  let opacity = initialOpacity * (1 - distance / 20);
  return opacity;
};

let priorityIndexFinder = (dataList: any) => {
  let priorityIndex = 0;
  for (let i = 0; i < dataList.length; i++) {
    if (dataList[i].priority) {
      priorityIndex = i;
      break;
    }
  }
  return priorityIndex;
};

let timeData = [
  {
    year: "1 AD",
    priority: false,
  },
  {
    year: "2 AD",
    priority: false,
  },
  {
    year: "3 AD",
    priority: false,
  },
  {
    year: "4 AD",
    priority: false,
  },
  {
    year: "5 AD",
    priority: false,
  },
  {
    year: "6 AD",
    priority: false,
  },
  {
    year: "7 AD",
    priority: false,
  },
  {
    year: "8 AD",
    priority: true,
  },
  {
    year: "9 AD",
    priority: false,
  },
  {
    year: "10 AD",
    priority: false,
  },
  {
    year: "11 AD",
    priority: false,
  },
  {
    year: "12 AD",
    priority: false,
  },
];

let eventData = [
  {
    title: "event 1",
    description: "description 1",
    priority: false,
  },
  {
    title: "event 2",
    description: "description 2",
    priority: false,
  },
  {
    title: "event 3",
    description: "description 3",
    priority: false,
  },
  {
    title: "event 4",
    description: "description 4",
    priority: false,
  },
  {
    title: "event 5",
    description: "description 5",
    priority: true,
  },
  {
    title: "event 6",
    description: "description 6",
    priority: false,
  },
  {
    title: "event 7",
    description: "description 7",
    priority: false,
  },
  {
    title: "event 8",
    description: "description 8",
    priority: false,
  },
  {
    title: "event 9",
    description: "description 9",
    priority: false,
  },
  {
    title: "event 10",
    description: "description 10",
    priority: false,
  },
  {
    title: "event 11",
    description: "description 11",
    priority: false,
  },
];

if (that.state === "time") {
  let priorityIndex = priorityIndexFinder(timeData);
  if (typingTool.tags.dataSlitsManager.selectedIndex) {
    priorityIndex = typingTool.tags.dataSlitsManager.selectedIndex;
  }
  let startingIndex = controlBot.tags[dim + "X"] - priorityIndex * 4;
  let dataSlitIds = [];
  for (let i = 0; i < timeData.length; i++) {
    let dataSlit = create({
      ...dataSlitsConfig,
      label: timeData[i].year,
      data: timeData[i],
      slitType: "time",
      scaleY: 0.8,
      labelFontSize: 1.2,
    });
    let dataSlitLineBot = create({
      ...dataSlitLine,
      slitType: "time",
      scaleY: 0.2,
      color: lineColors[Math.floor(Math.random() * lineColors.length)],
    });
    dataSlit.tags.lineId = dataSlitLineBot.tags.id;
    dataSlitIds.push(dataSlit.tags.id);
    animateTag(dataSlit, {
      fromValue: {
        [dim + "X"]: dataSlit.tags[dim + "X"],
        formOpacity: dataSlit.tags.formOpacity,
        labelOpacity: dataSlit.tags.labelOpacity,
        scaleX: dataSlit.tags.scaleX,
      },
      toValue: {
        [dim + "X"]: startingIndex + i * 4,
        formOpacity: opacityCalc(
          startingIndex + i * 4,
          controlBot.tags[dim + "X"],
          0.8
        ),
        labelOpacity: opacityCalc(
          startingIndex + i * 4,
          controlBot.tags[dim + "X"],
          1
        ),
        scaleX: 4,
      },
      duration: 1,
    });
    animateTag(dataSlitLineBot, {
      fromValue: {
        [dim + "X"]: dataSlitLineBot.tags[dim + "X"],
        formOpacity: dataSlitLineBot.tags.formOpacity,
        labelOpacity: dataSlitLineBot.tags.labelOpacity,
        scaleX: dataSlitLineBot.tags.scaleX,
      },
      toValue: {
        [dim + "X"]: startingIndex + i * 4,
        formOpacity: opacityCalc(
          startingIndex + i * 4,
          controlBot.tags[dim + "X"],
          0.8
        ),
        labelOpacity: opacityCalc(
          startingIndex + i * 4,
          controlBot.tags[dim + "X"],
          1
        ),
        scaleX: 4,
      },
      duration: 1,
    });
    if (i === priorityIndex) {
      setTimeout(() => {
        create({
          ...ArrowDownConfig,
          [dim + "X"]: startingIndex + i * 4,
          [dim + "Y"]: dataSlit.tags[dim + "Y"] - 2.4,
          controlBotId: dataSlit.tags.id,
        });
        whisper(typingTool, "createEventBots", { id: dataSlit.tags.id });
      }, 1000);
    }
  }
  typingTool.tags.dataSlitsManager.dataList = dataSlitIds;
  typingTool.tags.dataSlitsManager.selectedIndex = priorityIndex;
  typingTool.tags.dataSlitsManager.state = "time";
  whisper(typingTool, "createSlider", { id: controlBot.tags.id });
} else if (that.state === "incident") {
  let priorityIndex = priorityIndexFinder(eventData);
  let startingIndex = controlBot.tags[dim + "Y"] - priorityIndex * 3.5;
  let dataSlitIds = [];
  for (let i = 0; i < eventData.length; i++) {
    let label =
      getBot(
        byTag(
          "id",
          typingTool.tags.dataSlitsManager.dataList[
            typingTool.tags.dataSlitsManager.selectedIndex
          ]
        )
      ).tags.label +
      " " +
      eventData[i].title;
    let dataSlit = create({
      ...dataSlitsConfig,
      label,
      data: eventData[i],
      slitType: "incident",
      [dim + "X"]: controlBot.tags[dim + "X"] + 4,
      labelFontSize: 1,
    });
    dataSlitIds.push(dataSlit.tags.id);
    animateTag(dataSlit, {
      fromValue: {
        [dim + "Y"]: controlBot.tags[dim + "Y"],
        formOpacity: dataSlit.tags.formOpacity,
        labelOpacity: dataSlit.tags.labelOpacity,
      },
      toValue: {
        [dim + "Y"]: startingIndex + i * 3.5,
        formOpacity: opacityCalc(
          startingIndex + i * 3.5,
          controlBot.tags[dim + "Y"],
          0.8
        ),
        labelOpacity: opacityCalc(
          startingIndex + i * 3.5,
          controlBot.tags[dim + "Y"],
          1
        ),
      },
      duration: 1,
    });
  }
  typingTool.tags.eventSlitManager.dataList = dataSlitIds;
  typingTool.tags.eventSlitManager.selectedIndex = priorityIndex;
  typingTool.tags.eventSlitManager.state = "incident";
}
