const hooksBot = getBot("system", "app.hooks");
if(hooksBot)
{
    thisBot.masks.readingHistoryIntervalId = setInterval(() => {
        thisBot.ReadingHistoryUpdate();
    }, 1000);
}