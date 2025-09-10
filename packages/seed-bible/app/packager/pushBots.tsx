const { name, bot: B, first = false } = that
return
// console.log(bot)
const bot = { ...B }

if (!masks[`${name}-bots`])
    setTagMask(thisBot, `${name}-bots`, [], "local");

if (!first) {
    let arr = masks[`${name}-bots`]
    arr.push(bot.id)
    setTagMask(thisBot, `${name}-bots`, [...bot], "local");
}
else {
    let arr = masks[`${name}-bots`]
    arr.unshift(bot.id)
    setTagMask(thisBot, `${name}-bots`, [...bot], "local");
}