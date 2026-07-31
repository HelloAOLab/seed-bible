const dimension = os.getCurrentDimension();
const targetColorRgb = "#139981";
setTag(thisBot, "color", targetColorRgb);
setTag(thisBot, dimension, true);
const blinkDuration = 0.25;
const easing = { type: "sinusoidal", mode: "inout" };
setTagMask(thisBot, "scaleZ", 0.1);

try {
  await animateTag(thisBot, "formOpacity", {
    fromValue: 0,
    toValue: 0.5,
    duration: blinkDuration,
    easing,
  }).then(() => {
    return animateTag(thisBot, "formOpacity", {
      toValue: 0,
      duration: blinkDuration,
      easing,
    });
  });
} catch (error) {
  throw new Error(error);
} finally {
  setTag(thisBot, "color", thisBot.tags.initialColor);
  setTag(thisBot, "formOpacity", null);
  setTag(thisBot, dimension, false);
}
