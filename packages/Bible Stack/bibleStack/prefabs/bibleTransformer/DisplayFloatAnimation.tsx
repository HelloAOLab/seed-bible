/**
 * Performs a floating animation for the Bible object.
 * This animation makes the object move up and down in a sinusoidal pattern,
 * creating a smooth floating effect.
 *
 * The animation consists of three stages:
 * 1. Move up by 0.5 units over one-fourth of the total animation duration.
 * 2. Move down by 1 unit (0.5 units below the initial position) over half of the total animation duration.
 * 3. Return to the initial position over one-fourth of the total animation duration.
 *
 * The animation runs continuously as long as the isInAwaitAnimation flag is true.
 *
 * @example
 * thisBot.DisplayFloatAnimation();
 */

const dimension = os.getCurrentDimension();
const animationDuration = 6;
animateTag(thisBot, dimension + "Z", null);

const initialPositionZ = thisBot.tags.initialPositionZ;

while (thisBot.masks.isInAwaitAnimation) {
  try {
    await animateTag(thisBot, dimension + "Z", {
      toValue: initialPositionZ + 0.5,
      duration: animationDuration / 4,
      easing: { type: "sinusoidal", mode: "out" },
    }).then(async () => {
      await animateTag(thisBot, dimension + "Z", {
        toValue: initialPositionZ - 0.5,
        duration: animationDuration / 2,
        easing: { type: "sinusoidal", mode: "inout" },
      }).then(async () => {
        await animateTag(thisBot, dimension + "Z", {
          toValue: initialPositionZ,
          duration: animationDuration / 4,
          easing: { type: "sinusoidal", mode: "in" },
        });
      });
    });
  } catch (error) {
    console.error(error);
  }
}
