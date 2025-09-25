const {params} = that;

const {bot, dimension} = params;
const position = getBotPosition(bot, dimension)
if(bot.masks.transformer || bot.tags.transformer)
{
    if(!bot.links.transformerLink) setTagMask(bot, "transformerLink", `🔗${bot.masks.transformer ?? bot.tags.transformer}`)
    const transformerScale = bot.links.transformerLink.masks.scale ?? bot.links.transformerLink.tags.scale ?? 1;
    const transformerScales = thisBot.GetBotScales({bot: bot.links.transformerLink});
    position.z += (transformerScales.z * transformerScale)
}
return position;