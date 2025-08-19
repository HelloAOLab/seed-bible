const {element} = that;
const currUsersColor = thisBot.GetCurrentUsersColorForElement({element});
if(currUsersColor.length > 0) ObjectPooler.ReleaseObject({obj: currUsersColor, tag: currUsersColor[0].tags.poolTag})