const {remoteId} = that;
const usersLastSelectionCopy = thisBot.masks.usersLastSelection.slice()
const lastUserSelection = usersLastSelectionCopy.find((selection) => {return selection.userId == remoteId})
if(lastUserSelection)
{
    const index = usersLastSelectionCopy.indexOf(lastUserSelection)
    usersLastSelectionCopy.splice(index, 1);
    setTagMask(thisBot, 'usersLastSelection', usersLastSelectionCopy, "shared");
}
setTag(thisBot, "lastRemoteLeave", {leavingId: remoteId, myId: getID(configBot)});