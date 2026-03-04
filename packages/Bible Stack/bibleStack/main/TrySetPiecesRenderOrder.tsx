/**
 * Tries to set the render order for the pieces. This method manages the timing
 * of setting the render order to prevent it from being set too frequently, which can
 * lead to performance issues. It waits if a render order was recently set.
 *
 * @param {Object} that - Object containing an array of pieces to set its render order.
 * 
 * @example
 * thisBot.TrySetPiecesRenderOrder([botOne, botTwo]);
 */

const lastRenderOrderSetTime = thisBot.masks.lastRenderOrderSetTime;

if(lastRenderOrderSetTime)
{
    if(os.localTime - lastRenderOrderSetTime < 500)
    {
        if(!thisBot.masks.waitingToSetRenderOrder)
        {
            setTagMask(thisBot, "waitingToSetRenderOrder", true);
            setTimeout(() => {
                BibleVizUtils.Functions.SetRenderOrder({bots: that});
                setTagMask(thisBot, "waitingToSetRenderOrder", false);
            }, os.localTime - lastRenderOrderSetTime)
        }
    }
    else
    {
        BibleVizUtils.Functions.SetRenderOrder({bots: that});
        setTagMask(thisBot, "lastRenderOrderSetTime", os.localTime);
    }
}
else
{
    BibleVizUtils.Functions.SetRenderOrder({bots: that});
    setTagMask(thisBot, "lastRenderOrderSetTime", os.localTime);
}