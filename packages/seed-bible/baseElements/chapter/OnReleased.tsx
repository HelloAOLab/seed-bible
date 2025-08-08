/**
    * Resets the properties of the chapter's tags when it is released.
    * @example
    * chapter.OnReleased();
*/

thisBot.tags.toErase = false;
if(thisBot.tags.usersNotification)
{
    ObjectPooler.ReleaseObject({obj: links.usersNotification, tag: links.usersNotification.tags.poolTag})
    thisBot.tags.usersNotification = null;
}
InstanceManager.TryHideUsersColorOnElement({element: thisBot})