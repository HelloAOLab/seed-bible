setTagMask(thisBot, "onAnyBotClicked", `@
    const getAllChildIds = (id) => {
        const botById = getBot(byTag("id", id));
        let childrenIds = [];
        if (botById.masks.childIds && botById.masks.childIds.length > 0) {
            childrenIds = [...botById.masks.childIds];
            for (let i = 0; i < botById.masks.childIds.length; i++) {
                childrenIds = [...childrenIds, ...getAllChildIds(botById.masks.childIds[i])]
            }
        } else {
            return []
        }
        return childrenIds;
    }
    if((!globalThis?.annotInitialized || !globalThis?.annotBotIds) && !that.bot.tags.manager){
        console.log("starting annot")
        if(that.bot.tags.mmBot){
            let newChildrens = [that.bot.id, ...getAllChildIds(that.bot.id)]
            newChildrens.forEach(item => {
                let children = getBot(byID(item));
                newChildrens.push(children.tags.indexBot)
            })
            let allBots = [...newChildrens];
            whisper(getBot('system', 'experience.annotation'), "initialize", {botIds: [...allBots]});
        }else{
            whisper(getBot('system', 'experience.annotation'), "initialize", {botIds: [that.bot.tags.id]});
        }
    }else if(!annotBotIds.includes(that.bot.tags.id) && !that.bot.tags.manager){
        console.log("annot started")
        if(that.bot.tags.mmBot){
            let newChildrens = [that.bot.id, ...getAllChildIds(that.bot.id)]
            newChildrens.forEach(item => {
                let children = getBot(byID(item));
                newChildrens.push(children.tags.indexBot)
            })
            let allBots = [...newChildrens];
            setAnnotBotIds([...annotBotIds, ...allBots]);
        }else{
            setAnnotBotIds([...annotBotIds, that.bot.tags.id]);
        }
    }else if(annotBotIds.includes(that.bot.tags.id)){
        let tempAnnotBotIds = [...annotBotIds];
        if(that.bot.tags.mmBot){
            let newChildrens = [that.bot.id, ...getAllChildIds(that.bot.id)]
            newChildrens.forEach(item => {
                let children = getBot(byID(item));
                newChildrens.push(children.tags.indexBot)
            })
            let allBots = [...newChildrens];
            for(let child of allBots){
                tempAnnotBotIds.splice(tempAnnotBotIds.indexOf(child), 1)
            }
            setAnnotBotIds([...tempAnnotBotIds]);
        }else{
            tempAnnotBotIds.splice(tempAnnotBotIds.indexOf(that.bot.tags.id), 1)
            setAnnotBotIds([...tempAnnotBotIds]);
        }
    }
`, "tempLocal");