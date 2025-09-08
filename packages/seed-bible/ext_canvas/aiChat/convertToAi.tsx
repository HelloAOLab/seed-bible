const {node} = that;

let childrenIds = [node.tags.id, ...eventUtils.getAllChildIds(node.tags.id)];

for(let childId of childrenIds){
    let childBot = getBot(byID(childId));
    childBot.tags.eventBot = null;

    if(childBot.tags.nodeType === "expanse"){

    }else{
        childBot.tags.onClick = `@ shout("handleAiTextBotSelect", {botId: thisBot.tags.id})`;
        childBot.tags.onDrag = `@
            if(tags.parentTextBar){
                tags.parentTextBar = null;
                shout("createAiTextBot")
            }
            shout("createAiOptions", {clean: true});
            destroy(getBots("aiHideTool"));
        `,
        childBot.tags.onDrop = `@
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
        `
    }
}