/**
 * Executes a shake animation for the info label dot based on the specified shake direction.
 * The animation oscillates between the initial position and a shifted position determined by the shake direction.
 * @param {Object} that - Context object containing important data for the function.
 * @param {Vector2} that.shakeDirection - Vector indicating the direction of the shake animation.
 * @example
 * infoLabelDot.DisplayShakeAnimation({ shakeDirection: new Vector2(0.1, 0) });
 */

const { shakeDirection } = that;

const dimension = os.getCurrentDimension();
const duration = 0.5;
const easing = { type: "sinusoidal", mode: "inout" };

setTagMask(thisBot, dimension + "X", thisBot.tags.initialPosition.x);
setTagMask(thisBot, dimension + "Y", thisBot.tags.initialPosition.y);
setTagMask(thisBot, dimension + "Z", thisBot.tags.initialPosition.z);

try {
  await animateTag(thisBot, {
    fromValue: {
      [dimension + "X"]: thisBot.tags.initialPosition.x,
      [dimension + "Y"]: thisBot.tags.initialPosition.y,
    },
    toValue: {
      [dimension + "X"]: thisBot.tags.initialPosition.x + shakeDirection.x,
      [dimension + "Y"]: thisBot.tags.initialPosition.y + shakeDirection.y,
    },
    duration: duration / 4,
    easing,
  })
    .then(() => {
      return animateTag(thisBot, {
        fromValue: {
          [dimension + "X"]: thisBot.tags.initialPosition.x + shakeDirection.x,
          [dimension + "Y"]: thisBot.tags.initialPosition.y + shakeDirection.y,
        },
        toValue: {
          [dimension + "X"]: thisBot.tags.initialPosition.x,
          [dimension + "Y"]: thisBot.tags.initialPosition.y,
        },
        duration: duration / 4,
        easing,
      });
    })
    .then(() => {
      return animateTag(thisBot, {
        fromValue: {
          [dimension + "X"]: thisBot.tags.initialPosition.x,
          [dimension + "Y"]: thisBot.tags.initialPosition.y,
        },
        toValue: {
          [dimension + "X"]: thisBot.tags.initialPosition.x + shakeDirection.x,
          [dimension + "Y"]: thisBot.tags.initialPosition.y + shakeDirection.y,
        },
        duration: duration / 4,
        easing,
      });
    })
    .then(() => {
      return animateTag(thisBot, {
        fromValue: {
          [dimension + "X"]: thisBot.tags.initialPosition.x + shakeDirection.x,
          [dimension + "Y"]: thisBot.tags.initialPosition.y + shakeDirection.y,
        },
        toValue: {
          [dimension + "X"]: thisBot.tags.initialPosition.x,
          [dimension + "Y"]: thisBot.tags.initialPosition.y,
        },
        duration: duration / 4,
        easing,
      });
    });
} catch (error) {
  console.log(error);
}

return true;
