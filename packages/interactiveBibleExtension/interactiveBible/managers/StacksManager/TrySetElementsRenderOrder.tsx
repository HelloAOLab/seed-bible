/**
 * Tries to set the render order for the elements. This method manages the timing
 * of setting the render order to prevent it from being set too frequently, which can
 * lead to performance issues. It waits if a render order was recently set.
 *
 * @param {Object} that - Object containing an array of elements to set its render order.
 * 
 * @example
 * StacksManager.TrySetElementsRenderOrder([botOne, botTwo]);
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
                SetRenderOrder(that);
                setTagMask(thisBot, "waitingToSetRenderOrder", false);
            }, os.localTime - lastRenderOrderSetTime)
        }
    }
    else
    {
        SetRenderOrder(that);
        setTagMask(thisBot, "lastRenderOrderSetTime", os.localTime);
    }
}
else
{
    SetRenderOrder(that);
    setTagMask(thisBot, "lastRenderOrderSetTime", os.localTime);
}