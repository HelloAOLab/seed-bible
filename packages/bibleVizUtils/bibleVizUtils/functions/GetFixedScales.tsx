const {params} = that;

const {bot} = params;
const botScale = bot.masks.scale ?? bot.tags.scale ?? 1;
const botScales = GetBotScales(bot);
botScales.x *= botScale;
botScales.y *= botScale;
botScales.z *= botScale;

if(bot.masks.transformer || bot.tags.transformer)
{
    if(!bot.links.transformerLink) setTagMask(bot, "transformerLink", `🔗${bot.masks.transformer ?? bot.tags.transformer}`)
    const transformerScale = bot.links.transformerLink.masks.scale ?? bot.links.transformerLink.tags.scale ?? 1;
    const transformerScales = GetBotScales(bot.links.transformerLink);
    botScales.x *= (transformerScales.x * transformerScale);
    botScales.y *= (transformerScales.y * transformerScale);
    botScales.z *= (transformerScales.z * transformerScale);
}
return botScales;