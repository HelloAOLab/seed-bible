const dim = os.getCurrentDimension();

const eventTool = getBot('system', 'ext_canvas.eventTool');

const aiBarBot = getBot("aiBar");

const initialPlace = [aiBarBot.tags[dim + "X"], aiBarBot.tags[dim + "Y"]];

const aiTextBotConfig = {
    space: "tempLocal",
    [dim]: true,
    [dim + "X"]: initialPlace[0],
    [dim + "Y"]: initialPlace[1] + 0.7,
    scaleX: 6,
    scaleY: 1,
    scaleZ: 0.1,
    color: "#448AFF",
    formOpacity: 0.2,
    aiTextBot: true,
    parentTextBar: aiBarBot.tags.id,
    selectedAiBot: false,
    onDestroy: `@
        if(tags.parentTextBar){
            shout("createAiTextBot")
        }
        destroy(masks.lineTo)
    `,
    onDrag: `@
        if(tags.parentTextBar){
            tags.parentTextBar = null;
            shout("createAiTextBot")
        }
        shout("createAiOptions", {clean: true});
        destroy(getBots("aiHideTool"));
    `,
    onClick: `@ shout("handleAiTextBotSelect", {botId: thisBot.tags.id})`,
    label: "Type your questions here!",
    labelFontSize: 1,
    labelOpacity: 0.7,
    onDrop: `@
        const dim = os.getCurrentDimension();
        if(that.bot.id !== thisBot.tags.id && that.bot.tags.nodeType === "source" && !that.bot.masks.parentBotId){
            setTimeout(() => {
                const xDiff = that.from.x - that.to.x;
                const yDiff = that.from.y - that.to.y;
                let childrenIds = [...eventUtils.getAllChildIds(that.bot.id), that.bot.id];
                if(childrenIds){
                    for(let i = 0; i < childrenIds.length; i++){
                        let childBot = getBot(byID(childrenIds[i]));
                        childBot.tags[dim + "X"] = childBot.tags[dim + "X"] + xDiff;
                        childBot.tags[dim + "Y"] = childBot.tags[dim + "Y"] + yDiff;
                    }
                }
                destroy(getBots("hideTool"))
            }, 50)
            whisper(getBot("chatGptBot", true), "onClick", {text: \`tell me about \${that.bot.tags.label}\`});
            // shout("aiOptionOnClick", {text: \`tell me about \${that.bot.tags.label}\`});
        }else{
            shout("createAiOptions");
            shout("makeHideTool", {botId: tags.id, toolName: "aiHideTool"});
            shout("moveChildrens", {...that, id: thisBot.tags.id});
        }
    `,
    onCreate: `@
        let aiBar = getBot(byID(tags.parentTextBar));
        aiBar.tags.childTextBot = tags.id;
    `,
    toErase: true
}

const aiTextBot = create({
    ...aiTextBotConfig
});

// shout("handleAiTextBotSelect", {botId: aiBarBot.tags.id});