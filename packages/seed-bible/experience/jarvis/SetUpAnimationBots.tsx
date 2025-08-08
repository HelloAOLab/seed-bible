const baseBot = getBot('isBaseRingBot', true);
const amountOfBots = 34;
const anglePerBot = Math.PI*2/amountOfBots;
const vectorLength = 0.55;
let dimension = os.getCurrentDimension();
if(configBot.tags.miniMapPortal === "map_portal"){
    dimension = configBot.tags.miniMapPortal;
}
else if(configBot.tags.mapPortal === "houseChurch")
{
    dimension = configBot.tags.mapPortal;
}
setTagMask(thisBot, 'anglePerRingBot', anglePerBot);
thisBot.vars.ringBots = [];

for(let i = 0; i < amountOfBots; i++)
{
    const angle = i * anglePerBot;
    const vector = new Vector2(vectorLength * Math.cos(angle), vectorLength * Math.sin(angle));
    const bot = create(baseBot, {
        space: "tempLocal",
        isBaseRingBot: false,
        isRingBot: true,
        [dimension]: true,
        [dimension + 'X']: vector.x,
        [dimension + 'Y']: vector.y,
        [dimension + 'Z']: -((thisBot.tags.scaleZ/2) + (baseBot.tags.scaleZ/2)),
        initialPositionZ: -((thisBot.tags.scaleZ/2) + (baseBot.tags.scaleZ/2)),
        [dimension + 'RotationZ']: angle,
        creator: null,
        system: null,
        transformer: thisBot.id,
        jarvis: "🔗" + thisBot.id,
        ringIndex: i
    })
    thisBot.vars.ringBots.push(bot);
}