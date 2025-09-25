const dimension = os.getCurrentDimension();

const tabernacleBots = getBots("system").filter((bot) => {return bot.tags.system.includes("tabernacle")});

tabernacleBots.forEach((bot) => {
    if(Object.hasOwn(bot.tags, "Canvas-1X")) setTagMask(bot, dimension + "X", bot.tags["Canvas-1X"])
    if(Object.hasOwn(bot.tags, "Canvas-1Y")) setTagMask(bot, dimension + "Y", bot.tags["Canvas-1Y"])
    if(Object.hasOwn(bot.tags, "Canvas-1Z")) setTagMask(bot, dimension + "Z", bot.tags["Canvas-1Z"])
})