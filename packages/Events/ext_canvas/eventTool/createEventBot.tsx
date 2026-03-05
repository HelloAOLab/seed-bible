const { eventBotData } = that;

console.log(eventBotData);
let dim = os.getCurrentDimension();

const initialPlace = [0, -100];

const selectLabel = (data: any) => {
  switch (data.type) {
    case "place": {
      return data.displayTitle;
    }
    case "sim": {
      return data.title;
    }
    default: {
      return data.localizations.eng.preferred_label;
    }
  }
};

const eventBotConfig = {
  space: "tempLocal",
  [dim]: true,
  [dim + "X"]: that.position.x,
  [dim + "Y"]: that.position.y,
  scaleX: 6,
  scaleY: 1,
  scaleZ: 0.1,
  onCreate: `@
        shout("eventBotSelectManager", {botId: thisBot.tags.id});
    `,
  onClick: `@
        if(globalThis?.eventItemActive) return
        shout("eventBotSelectManager", {botId: thisBot.tags.id});
    `,
  eventBotType: eventBotData.type,
  eventBotData,
  eventMainBot: true,
  label: selectLabel(eventBotData),
  selectedEventBot: false,
  toErase: true,
  onDestroy: `@
        let eventToolBot = getBot('system', 'ext_canvas.eventTool');
        let tempEventBotIds = eventToolBot.tags.eventBotIds;
        tempEventBotIds.splice(tempEventBotIds.indexOf(thisBot.tags.id), 1);
        eventToolBot.tags.eventBotIds = [...tempEventBotIds];
        shout("eventBotSelectManager", {botId: null})
    `,
  onDrop: `@
        if(masks.prevSelect){
            shout("eventBotSelectManager", {botId: thisBot.tags.id});
            masks.prevSelect = null
        }
    `,
  onDrag: `@
        if(masks.selectedEventBot){
            shout("eventBotSelectManager", {botId: thisBot.tags.id});
            setTagMask(thisBot, "prevSelect", true, "tempLocal")
        }
    `,
};

let eventBot = create({
  ...eventBotConfig,
});

// os.focusOn(eventBot, {
//     duration: 0.5,
//     zoom: 10,
//     rotation: {x: 0, y: 0, z: 0}
// });

tags.eventBotIds = [...tags.eventBotIds, eventBot.tags.id];
