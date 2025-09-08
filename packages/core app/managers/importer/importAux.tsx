let abData = [];
for (let auxName of tags.auxNames) {
    let auxData = shout("onLookupABEggs", {
        aoID: auxName,
        returnType: "data"
    })
    await Promise.all(auxData).then(e => {
        abData.push(e[0]);
    })
}

let managerConfigs = []
let installedBots = []

for(let ab of abData){
    for(let state of Object.values(ab.state)){
        let prevBots = getBots("system", state.tags.system);
        if(prevBots.length > 0){
            const manager = prevBots.find((bot) => { return bot.tags.ext_manager })
            if(manager) 
            {
                console.log("ext_manager", manager)
                managerConfigs.push(manager.ext_configs());
            }
            continue
        }
        let newBot = create({
            ...state.tags,
            space: "local"
        });
        if(newBot.tags.onInstJoined){
            whisper(newBot, "onInstJoined")
        }
        if(newBot.tags.initialize){
            whisper(newBot, "initialize")
        }
        if(newBot.tags?.ext_manager){
            console.log("ext_manager", newBot)
            managerConfigs.push(newBot.ext_configs());
        }
        console.log("initiated", newBot.tags.system)
        installedBots.push(newBot.tags.system)
    }
}

setTagMask(thisBot, "installedBots", installedBots, "local");

const instateToolBarOptions = thisBot.instateToolBarOptions();

if (managerConfigs.length > 0) {
    managerConfigs.forEach(managerConfig => {
        if (managerConfig?.toolBarOptions) {
            instateToolBarOptions({ toolBarOptions: managerConfig?.toolBarOptions })
        }
    })
} else {
    instateToolBarOptions({ toolBarOptions: { page: [], canvas: [], map: [] } })
}
