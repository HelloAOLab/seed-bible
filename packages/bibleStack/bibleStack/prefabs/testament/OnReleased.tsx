/**
    * Resets the properties of the testament's tags when it is released.
    * @example
    * testament.OnReleased();
*/

thisBot.tags.infoLabel = null;
thisBot.tags.formOpacity = null;
thisBot.tags.testamentName = null;
thisBot.tags.draggable = null;
thisBot.tags.arrangementIndex = null
thisBot.tags.testamentIndex = null;
thisBot.tags.scale = null;
thisBot.tags.scaleX = null;
thisBot.tags.scaleY = null;
thisBot.tags.scaleZ = null;
thisBot.tags.initialScaleX = null;
thisBot.tags.hoveredScaleX = null;
thisBot.tags.initialScaleY = null;
thisBot.tags.hoveredScaleY = null;
thisBot.tags.initialScaleZ = null;
thisBot.tags.desiredScaleZ = null;
thisBot.tags.transformer = null;
thisBot.tags.toErase = false;
if(thisBot.tags.usersNotification)
{
    ObjectPooler.ReleaseObject({obj: links.usersNotification, tag: links.usersNotification.tags.poolTag})
    thisBot.tags.usersNotification = null;
}
