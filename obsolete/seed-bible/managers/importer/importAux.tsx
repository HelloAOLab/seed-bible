const abData = [];
for (const auxName of tags.auxNames) {
  const auxData = shout("onLookupABEggs", {
    aoID: auxName,
    returnType: "data",
  });
  await Promise.all(auxData).then((e) => {
    abData.push(e[0]);
  });
}

const managerConfigs = [];
const installedBots = [];

for (const ab of abData) {
  for (const state of Object.values(ab.state)) {
    const prevBots = getBots("system", state.tags.system);
    if (prevBots.length > 0) {
      const manager = prevBots.find((bot) => {
        return bot.tags.ext_manager;
      });
      if (manager) {
        console.log("ext_manager", manager);
        managerConfigs.push(manager.ext_configs());
      }
      continue;
    }
    const newBot = create({
      ...state.tags,
      space: "local",
    });
    if (newBot.tags.onInstJoined) {
      whisper(newBot, "onInstJoined");
    }
    if (newBot.tags.initialize) {
      whisper(newBot, "initialize");
    }
    if (newBot.tags?.ext_manager) {
      console.log("ext_manager", newBot);
      managerConfigs.push(newBot.ext_configs());
    }
    console.log("initiated", newBot.tags.system);
    installedBots.push(newBot.tags.system);
  }
}

setTagMask(thisBot, "installedBots", installedBots, "local");

const instateToolBarOptions = thisBot.instateToolBarOptions();

if (managerConfigs.length > 0) {
  managerConfigs.forEach((managerConfig) => {
    if (managerConfig?.toolBarOptions) {
      instateToolBarOptions({ toolBarOptions: managerConfig?.toolBarOptions });
    }
  });
} else {
  instateToolBarOptions({ toolBarOptions: { page: [], canvas: [], map: [] } });
}
