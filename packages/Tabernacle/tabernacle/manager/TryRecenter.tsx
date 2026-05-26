import {
  MakePortalFree,
  MakePortalRestrict,
} from "bibleVizUtils.functions.index";

if (!thisBot.vars.appId) return;

const center = new Vector3(0, 0, 0);
const threshold = 60;
const focusPoint = os.getFocusPoint("grid");
const focusPointToCenterDistance = focusPoint.subtract(center).length();

const isFocusPointInsideArea = focusPointToCenterDistance <= threshold;
const shouldRecenter = !isFocusPointInsideArea;

if (shouldRecenter) {
  MakePortalRestrict();
  const duration = 1;
  const easing = { type: "sinusoidal", mode: "inout" };
  await os.focusOn(
    { x: center.x, y: center.y, z: center.z },
    {
      duration,
      easing,
    }
  );
  MakePortalFree();
}
