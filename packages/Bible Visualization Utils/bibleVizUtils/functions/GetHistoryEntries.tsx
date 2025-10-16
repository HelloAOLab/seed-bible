const {typeOfPiece, book, chapter} = that;

if(!thisBot.vars.hooksBot)
{
    const hooksBot = getBot("system", "app.hooks");
    if(hooksBot) thisBot.vars.hooksBot = hooksBot;
}
if(!thisBot.vars.hooksBot) return null;

const bookId = BibleVizUtils.Data.tags.booksStaticInfo[book].abbreviation
const timestamp = thisBot.vars.hooksBot.vars.tempReadingHistory[configBot.id]?.[bookId]?.[chapter]

return timestamp