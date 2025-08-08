/**
    * Updates the opacity of the cover if the camera rotation changes and the cover is in use.
    * @example
    * shout("OnCameraRotationChanged");
*/

if(!thisBot.tags.isBaseCover && thisBot.tags.isInUse && thisBot.tags.isUpperCover)
{
    const bibleData = StacksManager.GetBibleDataById({bibleId: thisBot.tags.bibleId});
    if(bibleData.currentState === BibleState.Open) thisBot.SetOpacity();
}