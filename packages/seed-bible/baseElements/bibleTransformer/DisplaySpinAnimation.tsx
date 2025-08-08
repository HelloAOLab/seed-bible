/**
    * Initiates a spinning animation for the Bible along the specified dimension.
    * The animation rotates the bot continuously while in an awaiting state.
    * @example
    * bibleTransformer.DisplaySpinAnimation()
*/

const dimension = os.getCurrentDimension();
const initialRotationZ = 0;
const animationDuration = 40;

setTagMask(thisBot, dimension + "RotationZ", initialRotationZ);

try
{
    await animateTag(thisBot, dimension + "RotationZ", {
        toValue: Math.PI * 2,
        duration: animationDuration * 1.25,
        easing: {type: "sinusoidal", mode: "in"}
    })
}catch(error){}

while(thisBot.masks.isInAwaitAnimation)
{
    setTagMask(thisBot, dimension + "RotationZ", initialRotationZ);
    try
    {
        await animateTag(thisBot, dimension + "RotationZ", {
            toValue: Math.PI * 2,
            duration: animationDuration,
            easing: "linear"
        })
    }
    catch(error){console.error(error)}
}