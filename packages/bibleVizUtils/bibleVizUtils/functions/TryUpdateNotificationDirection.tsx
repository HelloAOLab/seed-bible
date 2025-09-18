const {bot} = that;

if(
    !bot.tags.isBaseStackBook &&
    !bot.tags.isBaseStackSection &&
    !bot.tags.isBaseStackTestament &&
    bot.tags.isInUse && 
    bot.links.activityNotification
)
{
    const direction = BibleVizUtils.Functions.GetDirectionForNotification();

    if(bot.links.activityNotification.tags.direction.x != direction.x || bot.links.activityNotification.tags.direction.y != direction.y)
    {
        setTag(bot.links.activityNotification, "direction", direction);
        bot.links.activityNotification.SetPosition({setX: true, setY: true, setZ: true});
    }
}