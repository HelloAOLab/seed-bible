if (!thisBot.vars.appId) return;

const center = new Vector3(0, 0, 0);
const threshold = 60;
const focusPoint = os.getFocusPoint("grid");
const focusPointToCenterDistance = focusPoint.subtract(center).length();

const isFocusPointInsideArea = focusPointToCenterDistance <= threshold;
const shouldRecenter = !isFocusPointInsideArea;

console.log(`[Debug] TryRecenter`, {
  threshold,
  focusPoint,
  focusPointToCenterDistance,
  isFocusPointInsideArea,
  shouldRecenter,
});

if (shouldRecenter) {
  BibleVizUtils.Functions.MakePortalRestrict();
  const duration = 1;
  const easing = { type: "sinusoidal", mode: "inout" };
  await os.focusOn(
    { x: center.x, y: center.y, z: center.z },
    {
      duration,
      easing,
    }
  );
  BibleVizUtils.Functions.MakePortalFree();
}
