const {piece} = that;
const currUsersColor = thisBot.GetCurrentUsersColorForElement({piece});
if(currUsersColor.length > 0) ObjectPooler.ReleaseObject({obj: currUsersColor, tag: currUsersColor[0].tags.poolTag})