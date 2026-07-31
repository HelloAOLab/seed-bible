const dim = os.getCurrentDimension();
const timeBot = getBot(byID(that.id));
const eventBots = getBots("eventBot");
destroy(eventBots);

const eventData = [...timeBot.tags.eventData];

const eventBotConfig = {
  space: "tempLocal",
  [dim]: true,
  color: "#84FFFF",
  strokeWidth: 0.4,
  formOpacity: 0.2,
  eventBot: true,
  scaleX: 6,
  scaleY: 0.9,
  scaleZ: 0.1,
  labelOpacity: 0.6,
  labelFontSize: 1,
  onClick: tags.eventBotOnClick,
  onDestroy: `@
        destroy(masks.lineTo)
    `,
  onDrop: `@
        const dim = os.getCurrentDimension();
        if(that.bot.id === thisBot.tags.id){
            const xDiff = that.from.x - that.to.x;
            const yDiff = that.from.y - that.to.y;
            let childrenIds = eventUtils.getAllChildIds(tags.id);
            if(childrenIds){
                for(let i = 0; i < childrenIds.length; i++){
                    let childBot = getBot(byID(childrenIds[i]));
                    childBot.tags[dim + "X"] = childBot.tags[dim + "X"] - xDiff;
                    childBot.tags[dim + "Y"] = childBot.tags[dim + "Y"] - yDiff;
                }
            }
            
            if(thisBot.masks.selectedNodeBot){
                shout("handleNodeSelect", {botId: null});
            }
            shout("convertToAi", {node: thisBot})
        }
    `,
  onDrag: `@ destroy(getBots("hideTool"));`,
  toErase: true,
};

globalThis.eventBotConfig = eventBotConfig;

for (let i = 0; i < eventData.length; i++) {
  create({
    ...eventBotConfig,
    [dim + "X"]: timeBot.tags[dim + "X"],
    [dim + "Y"]: timeBot.tags[dim + "Y"] - i - 1.5,
    label: eventData[i].title,
    formOpacity: i < 1 ? 0.3 : 0,
    labelOpacity: i < 1 ? 0.8 : 0,
    strokeColor: i < 1 ? "#40C4FF" : "transparent",
    pointable: i < 1,
    index: i,
    initPos: {
      x: timeBot.tags[dim + "X"] - 1.1,
      y: timeBot.tags[dim + "Y"] - i - 1.5,
    },
    data: eventData[i].eventData,
    type: "event",
    nodeType: "source",
  });
}
