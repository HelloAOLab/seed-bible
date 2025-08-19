const {element} = that;
if(element.links.usersNotification)
{
    ObjectPooler.ReleaseObject({obj: element.links.usersNotification, tag: element.links.usersNotification.tags.poolTag});
    element.tags.usersNotification = null;
}