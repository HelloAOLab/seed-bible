import { GetCamRotationFocusPoint } from "bibleVizUtils.functions.index";

if (thisBot.masks.isBibleAnimating || !thisBot.vars.stackBiblesData[0]) return;

const viewportUpperLeftScreenCoordinates =
  await os.calculateScreenCoordinatesFromViewportCoordinates(
    "grid",
    new Vector2(-1, 1)
  );
const dimension = os.getCurrentDimension();
const transformer =
  thisBot.vars.stackBiblesData[0]?.staticBiblePieces.bibleTransformer;
const transformerPosition = getBotPosition(transformer, dimension);
const projectedTransformerPosition = new Vector3(
  transformerPosition.x,
  transformerPosition.y,
  0
);
const upperCoverPosition = getBotPosition(
  thisBot.vars.stackBiblesData[0]?.staticBiblePieces.upperCover,
  dimension
);
const upperCoverFixedPosition = upperCoverPosition.add(transformerPosition);
const cameraRotation = os.getCameraRotation("grid");
const cameraForwardDirection = math.getForwardDirection(cameraRotation);
const { phi, theta } = DirectionToPolar(cameraForwardDirection);
const limitPosition = GetCamRotationFocusPoint({
  theta,
  phi,
  botPosition: upperCoverFixedPosition,
});
const areaRadius = limitPosition
  .subtract(projectedTransformerPosition)
  .length();
const focusPoint = os.getFocusPoint("grid");
const focusPointToCenterDistance = focusPoint
  .subtract(projectedTransformerPosition)
  .length();

const transformerCoordinates = await os.calculateScreenCoordinatesFromPosition(
  "grid",
  transformerPosition
);
const fixedTransormerCoordinates = transformerCoordinates.subtract(
  viewportUpperLeftScreenCoordinates
);
const upperCoverCoordinates = await os.calculateScreenCoordinatesFromPosition(
  "grid",
  upperCoverFixedPosition
);
const fixedUpperCoverCoordinates = upperCoverCoordinates.subtract(
  viewportUpperLeftScreenCoordinates
);

const isFocusPointInsideArea = focusPointToCenterDistance <= areaRadius;
const isTransformerVisible =
  fixedTransormerCoordinates.x >= 0 &&
  fixedTransormerCoordinates.x <= gridPortalBot.tags.pixelWidth &&
  fixedTransormerCoordinates.y >= 0 &&
  fixedTransormerCoordinates.y <= gridPortalBot.tags.pixelHeight;
const isUpperCoverVisible =
  fixedUpperCoverCoordinates.x >= 0 &&
  fixedUpperCoverCoordinates.x <= gridPortalBot.tags.pixelWidth &&
  fixedUpperCoverCoordinates.y >= 0 &&
  fixedUpperCoverCoordinates.y <= gridPortalBot.tags.pixelHeight;
const shouldRecenter =
  !isFocusPointInsideArea && !isTransformerVisible && !isUpperCoverVisible;

if (shouldRecenter) {
  BibleVizUtils.Functions.MakePortalRestrict();
  setTagMask(thisBot, "isBibleAnimating", true);
  const duration = 1;
  const easing = { type: "sinusoidal", mode: "inout" };
  await os.focusOn(transformer, {
    duration,
    easing,
  });
  setTagMask(thisBot, "isBibleAnimating", false);
  BibleVizUtils.Functions.MakePortalFree();
}

function DirectionToPolar(vector) {
  const phi = Math.acos(-vector.z);
  const theta = Math.atan2(-vector.x, vector.y);

  return { phi, theta };
}
