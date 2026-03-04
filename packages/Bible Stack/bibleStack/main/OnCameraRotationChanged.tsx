/**
 * Updates the render order of Bible pieces when the camera rotation changes.
 *
 * @example
 * shout("OnCameraRotationChanged");
 */

const biblePieces = getBots(
  byTag("isStackPiece", true),
  byTag("isInUse", true)
);
if (biblePieces.length > 0) {
  thisBot.TrySetPiecesRenderOrder(biblePieces);
}
