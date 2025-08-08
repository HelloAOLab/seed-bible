let {bot, dimension, duration = 3} = that;

if(configBot.tags.miniMapPortal === "map_portal"){
    dimension = configBot.tags.miniMapPortal;
}
else if(configBot.tags.mapPortal === "houseChurch")
{
    dimension = configBot.tags.mapPortal;
}
const botPosition = getBotPosition(bot, dimension);
const botScales = GetBotScales(bot);
const scanningRadius = Math.sqrt(Math.pow(botScales.x/2, 2) + Math.pow(botScales.y/2, 2))
thisBot.Scanning({worldPosition: botPosition, scanningRadius, scanningHeight: botScales.z})
thisBot.masks.timeout = setTimeout(() => {
    thisBot.masks.timeout = null;
    thisBot.Idle();
}, duration * 1000)