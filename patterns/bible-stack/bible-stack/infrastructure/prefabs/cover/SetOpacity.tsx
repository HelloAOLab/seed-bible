/**
 * Sets the opacity of the cover based on the camera's rotation and its angle relative to the XY plane.
 * Adjusts the opacity within a threshold range.
 * @example
 * cover.SetOpacity();
 */

const camForwardDirection = math.getForwardDirection(
  os.getCameraRotation("grid")
);
const camDirectionXY = new Vector3(
  camForwardDirection.x,
  camForwardDirection.y,
  0
).normalize();
const angle = Vector3.angleBetween(camForwardDirection, camDirectionXY);
const minRotationTreshold = math.degreesToRadians(50);
const maxRotationTreshold = math.degreesToRadians(70);
const opacity = GetOpacity(angle, minRotationTreshold, maxRotationTreshold);

setTagMask(thisBot, "formOpacity", opacity);

function GetOpacity(angle, minThreshold, maxThreshold) {
  const opacity =
    1 -
    0.9 *
      Math.max(
        0,
        Math.min(1, (angle - minThreshold) / (maxThreshold - minThreshold))
      );
  return opacity;
}
