const {remoteUserSelection} = that;

const usersLastSelectionCopy = thisBot.masks.usersLastSelection.slice()
const lastUserSelection = usersLastSelectionCopy.find((selection) => {return selection.userId == remoteUserSelection.userId})
if(lastUserSelection)
{
    const index = usersLastSelectionCopy.indexOf(lastUserSelection)
    usersLastSelectionCopy.splice(index, 1, remoteUserSelection);
}
else
{
    usersLastSelectionCopy.push(remoteUserSelection);
}
setTagMask(thisBot, 'usersLastSelection', usersLastSelectionCopy, "shared");
// thisBot.TryStartWateringProcess();