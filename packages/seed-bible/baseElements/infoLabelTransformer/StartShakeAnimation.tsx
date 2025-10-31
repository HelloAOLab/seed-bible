/**
    * Starts a shaking animation for the info label and its tail based on their positioning.
    * If a shake animation is already in progress, it stops the previous animation before starting a new one.
    * 
    * @param {object} that - Object containing important data for the function
    * @param {number} that.shakeIntervalId - ID of the interval for the shake animation
    * 
    * @example
    * infoLabelTransformer.StartShakeAnimation()
*/

if(thisBot.masks.shakeIntervalId)
{
    thisBot.StopShakeAnimation();
}

const intervalId;
const shakeAnimationDelayTimeInMs = 5000;
let shakeDirection;

switch(thisBot.tags.labelPositioning)
{
    default:
    case LabelPositioning.LeftSided: {
        shakeDirection = new Vector2(0.1, 0)
    }
    break;
    case LabelPositioning.RightSided: {
        shakeDirection = new Vector2(-0.1, 0)
    }
    break;
    case LabelPositioning.Top: {
        shakeDirection = new Vector2(0, -0.1)
    }
    break;
    case LabelPositioning.RightSidedCorner: {
        shakeDirection = new Vector2(-0.1, -0.1)
    }
    break;
}

intervalId = setInterval(() => {
    const {infoLabel, infoLabelTail, infoLabelDate, infoLabelUsersColor} = thisBot.GetLabelElements();
    
    if(infoLabel)
    {
        infoLabel.DisplayShakeAnimation({shakeDirection})
    }
    if(infoLabelTail)
    {
        infoLabelTail.DisplayShakeAnimation({shakeDirection})
    }
    if(infoLabelDate)
    {
        infoLabelDate.DisplayShakeAnimation({shakeDirection})
    }
    if(infoLabelUsersColor.length > 0)
    {

        infoLabelUsersColor.forEach((userColor) => {
            userColor.DisplayShakeAnimation({shakeDirection})
        })
    }
}, shakeAnimationDelayTimeInMs)

setTag(thisBot, "shakeIntervalId", intervalId);