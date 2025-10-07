let dim = os.getCurrentDimension();
const typingTool = getBot(byTag("typingTool"));
let controlBot = getBot(byTag("id", typingTool.tags.currentWritingBotId));

let opacityCalc = (botPosition, parentPosition, initialOpacity) => {
  let distance = Math.sqrt(
    (parentPosition - botPosition) * (parentPosition - botPosition)
  );
  let opacity = initialOpacity * (1 - distance / 20);
  return opacity;
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

if (that.action === "left") {
  let priorityIndex = typingTool.tags.dataSlitsManager.selectedIndex - 1;
  if (priorityIndex < 0) {
    return;
  }
  let upArrow = getBots("arrowUp");
  let downArrow = getBots("arrowDown");
  let dataSlits = getBots(byTag("slitType", "incident"));
  let eventBots = getBots("eventBot");
  destroy(eventBots);
  destroy(upArrow);
  destroy(downArrow);
  destroy(dataSlits);
  let startingIndex = controlBot.tags[dim + "X"] - priorityIndex * 4;
  for (let i = 0; i < typingTool.tags.dataSlitsManager.dataList.length; i++) {
    let dataSlit = getBot(
      byTag("id", typingTool.tags.dataSlitsManager.dataList[i])
    );
    let dataSlitLine = getBot(byTag("id", dataSlit.tags.lineId));
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
      duration: 0.5,
    });
    animateTag(dataSlitLine, {
      fromValue: {
        [dim + "X"]: dataSlitLine.tags[dim + "X"],
        formOpacity: dataSlitLine.tags.formOpacity,
        labelOpacity: dataSlitLine.tags.labelOpacity,
        scaleX: dataSlitLine.tags.scaleX,
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
      duration: 0.5,
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
      }, 500);
    }
  }
  typingTool.tags.dataSlitsManager.selectedIndex -= 1;
  setSliderValue(priorityIndex);
} else if (that.action === "right") {
  let priorityIndex = typingTool.tags.dataSlitsManager.selectedIndex + 1;
  if (priorityIndex + 1 > typingTool.tags.dataSlitsManager.dataList.length) {
    return;
  }
  let upArrow = getBots("arrowUp");
  let downArrow = getBots("arrowDown");
  let dataSlits = getBots(byTag("slitType", "incident"));
  let eventBots = getBots("eventBot");
  destroy(eventBots);
  destroy(upArrow);
  destroy(downArrow);
  destroy(dataSlits);
  let startingIndex = controlBot.tags[dim + "X"] - priorityIndex * 4;
  for (let i = 0; i < typingTool.tags.dataSlitsManager.dataList.length; i++) {
    let dataSlit = getBot(
      byTag("id", typingTool.tags.dataSlitsManager.dataList[i])
    );
    let dataSlitLine = getBot(byTag("id", dataSlit.tags.lineId));
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
      duration: 0.5,
    });
    animateTag(dataSlitLine, {
      fromValue: {
        [dim + "X"]: dataSlitLine.tags[dim + "X"],
        formOpacity: dataSlitLine.tags.formOpacity,
        labelOpacity: dataSlitLine.tags.labelOpacity,
        scaleX: dataSlitLine.tags.scaleX,
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
      duration: 0.5,
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
      }, 500);
    }
  }
  typingTool.tags.dataSlitsManager.selectedIndex += 1;
  setSliderValue(priorityIndex);
}
