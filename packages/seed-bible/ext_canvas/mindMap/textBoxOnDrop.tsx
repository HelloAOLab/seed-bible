await os.sleep(100);
const typingTool = getBot(byTag("typingTool"));
const dim = os.getCurrentDimension();
if(typingTool.tags.currentWritingBotId === thisBot.tags.id){
    whisper(typingTool, "menuOnCreate", {
        [dim + "X"]: thisBot.tags[dim + "X"],
        [dim + "Y"]: thisBot.tags[dim + "Y"],
        id: thisBot.tags.id,
        textBot: thisBot.tags.textBox
    })
}
if(that?.bot.id !== tags.id && that?.bot.tags.textBox){
    const firstBot = whisper(typingTool, "createMMBot", {from: {x: tags[dim + "X"], y: tags[dim + "Y"]}, label: thisBot.masks.label ? thisBot.masks.label : " ", config: {
        formAddress: thisBot.masks.formAddress ? thisBot.masks.formAddress : thisBot.tags.formAddress ? thisBot.tags.formAddress : null,
        voiceNote: thisBot.masks.voiceNote ? thisBot.masks.voiceNote : thisBot.tags.voiceNote ? thisBot.tags.voiceNote : null,
        prevScaleX: thisBot.tags?.prevScaleX ? thisBot.tags.prevScaleX : null,
        prevScaleY: thisBot.tags?.prevScaleY ? thisBot.tags.prevScaleY : null
    }});
    const secondBot = whisper(typingTool, "createMMBot", {from: {x: tags[dim + "X"] + 10, y: tags[dim + "Y"]}, parentBot: firstBot[0].bot, label: that.bot.masks.label ? that.bot.masks.label : " ", config: {
        formAddress: that.bot.masks.formAddress ? that.bot.masks.formAddress : that.bot.tags.formAddress ? that.bot.tags.formAddress : null,
        voiceNote: that.bot.masks.voiceNote ? that.bot.masks.voiceNote : that.bot.tags.voiceNote ? that.bot.tags.voiceNote : null,
        prevScaleX: that.bot.tags?.prevScaleX ? that.bot.tags.prevScaleX : null,
        prevScaleY: that.bot.tags?.prevScaleY ? that.bot.tags.prevScaleY : null
    }});
    destroy(that.bot);
    destroy(thisBot);
}
