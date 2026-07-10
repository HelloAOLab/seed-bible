/**
 * Updates the opacity of the cover if the camera rotation changes and the cover is in use.
 * @example
 * shout("OnCameraRotationChanged");
 */

if (
  !thisBot.tags.isBaseStackCover &&
  thisBot.tags.isInUse &&
  thisBot.tags.isUpperCover
) {
  const bibleData = BibleStackManager.GetBibleDataById({
    stackBibleId: thisBot.tags.stackBibleId,
  });
  if (bibleData.currentState === BibleStates.Open) thisBot.SetOpacity();
}
