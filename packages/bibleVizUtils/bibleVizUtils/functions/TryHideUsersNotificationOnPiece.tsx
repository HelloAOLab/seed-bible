const {piece} = that;
if(piece.links.usersNotification)
{
    ObjectPooler.ReleaseObject({obj: piece.links.usersNotification, tag: piece.links.usersNotification.tags.poolTag});
    piece.tags.usersNotification = null;
}