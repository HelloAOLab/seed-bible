/**
    * Updates the render order of Bible elements when the camera rotation changes.
    *
    * @example
    * shout("OnCameraRotationChanged");
*/

const bibleElements = getBots(byTag('isBibleElement', true), byTag('isInUse', true));
if(bibleElements.length > 0)
{
    thisBot.TrySetElementsRenderOrder(bibleElements);
}