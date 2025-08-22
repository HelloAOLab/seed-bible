/**
    * Releases the info label transformer and its associated info label and tail, stopping animations and releasing objects back to the pool.
    * @example
    * infoLabelTransformer.OnReleased();
    */

const {infoLabel, infoLabelTail, infoLabelDate, infoLabelUsersColor} = thisBot.GetLabelElements();
thisBot.StopShakeAnimation();
setTag(thisBot, "ownerBotId", null);
setTag(thisBot, "isDonationLabelTransformer", null);
if(infoLabel) ObjectPooler.ReleaseObject({obj: infoLabel, tag: infoLabel.tags.poolTag});
if(infoLabelTail) ObjectPooler.ReleaseObject({obj: infoLabelTail, tag: infoLabelTail.tags.poolTag});
if(infoLabelDate) ObjectPooler.ReleaseObject({obj: infoLabelDate, tag: infoLabelDate.tags.poolTag});
if(infoLabelUsersColor?.length > 0) ObjectPooler.ReleaseObject({obj: infoLabelUsersColor, tag: infoLabelUsersColor[0].tags.poolTag});