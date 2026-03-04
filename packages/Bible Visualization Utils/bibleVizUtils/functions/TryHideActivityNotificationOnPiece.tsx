const {piece} = that;
if(piece.links.activityNotification)
{
    ObjectPooler.ReleaseObject({obj: piece.links.activityNotification, tag: piece.links.activityNotification.tags.poolTag});
    piece.tags.activityNotification = null;
}