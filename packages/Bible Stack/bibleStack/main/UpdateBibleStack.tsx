import { GetBotScales } from "bibleVizUtils.functions.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

/**
 * Updates the Bible stack by adjusting the position of pieces based on the current state of the Bible.
 * Animates the covers, testaments, and the cross within the stack, using the provided speed multiplier for smooth transitions.
 *
 * @param {Object} that - The object containing `bibleData` and `speedMultiplier`.
 * @param {StackBibleData} that.bibleData - The Bible data to be updated.
 * @param {number} that.speedMultiplier - The speed multiplier used to adjust the animation duration.
 * @returns {Promise<boolean>} Resolves once all animations are completed.
 *
 * @example
 * thisBot.UpdateBibleStack({ bibleData: someBibleData, speedMultiplier: 2 });
 */

const { bibleData, speedMultiplier, isInstantaneous } = that;
const dimension = os.getCurrentDimension();
const duration = isInstantaneous ? 0 : 0.5 / speedMultiplier;
const easing = { type: "sinusoidal", mode: "inout" };
const lowerCoverPosition = getBotPosition(
  bibleData.staticBiblePieces.lowerCover,
  dimension
);
const lowerCoverScales = GetBotScales(bibleData.staticBiblePieces.lowerCover);
const upperCoverScales = GetBotScales(bibleData.staticBiblePieces.upperCover);
const isBibleEmpty = IsBibleEmpty();
const isCrossInMiddle =
  bibleData.childrenData.every((testamentData) => {
    return testamentData.isSplitIntoSections;
  }) && !isBibleEmpty;
const animations = [];
let crossNewPositionZ = null;
const stackStructure = GetBibleStackStructure();
const initialPositionZ = lowerCoverPosition.z + lowerCoverScales.z;
let nextPositionZ = initialPositionZ;

if (!isBibleEmpty) {
  nextPositionZ += BibleVizDataRepository.getStackSpacing(
    "BetweenArrangements"
  );
  for (const testamentData of stackStructure) {
    const { testamentDeltaPositionZ, newTestamentAnimations } =
      await thisBot.HandleTestamentDataInStack({
        isInstantaneous,
        testamentData,
        desiredPositionZ: nextPositionZ,
        dimension,
        duration,
        easing,
        speedMultiplier,
      });
    animations.push(...newTestamentAnimations);
    nextPositionZ += testamentDeltaPositionZ;
    if (isCrossInMiddle && stackStructure.indexOf(testamentData) === 0) {
      crossNewPositionZ =
        nextPositionZ +
        BibleVizDataRepository.getStackSpacing("BetweenArrangements") / 2;
    }
    nextPositionZ += BibleVizDataRepository.getStackSpacing(
      "BetweenArrangements"
    );
  }
}

if (!isCrossInMiddle) {
  crossNewPositionZ = isBibleEmpty
    ? initialPositionZ + upperCoverScales.z
    : nextPositionZ + BibleVizDataRepository.getStackSpacing("CoverToCross");
}

const targetCrossPosition = isCrossInMiddle
  ? BibleVizUtils.Data.tags.CrossPosition.Middle
  : BibleVizUtils.Data.tags.CrossPosition.Top;

if (bibleData.currentCrossPosition !== targetCrossPosition) {
  bibleData.currentCrossPosition = targetCrossPosition;

  if (isInstantaneous) {
    setTagMask(
      [
        bibleData.staticBiblePieces.crossVerticalLine,
        bibleData.staticBiblePieces.crossHorizontalLine,
      ],
      "formOpacity",
      1
    );
  } else {
    animations.push(
      animateTag(
        [
          bibleData.staticBiblePieces.crossVerticalLine,
          bibleData.staticBiblePieces.crossHorizontalLine,
        ],
        "formOpacity",
        {
          toValue: 0,
          duration: duration / 2,
          easing,
        }
      ).then(() => {
        setTagMask(
          [
            bibleData.staticBiblePieces.crossVerticalLine,
            bibleData.staticBiblePieces.crossHorizontalLine,
          ],
          dimension + "Z",
          crossNewPositionZ
        );
        return animateTag(
          [
            bibleData.staticBiblePieces.crossVerticalLine,
            bibleData.staticBiblePieces.crossHorizontalLine,
          ],
          "formOpacity",
          {
            toValue: 1,
            duration: duration / 2,
            easing,
          }
        );
      })
    );
  }
} else {
  if (!isInstantaneous) {
    animations.push(
      animateTag(
        [
          bibleData.staticBiblePieces.crossVerticalLine,
          bibleData.staticBiblePieces.crossHorizontalLine,
        ],
        dimension + "Z",
        {
          toValue: crossNewPositionZ,
          duration,
          easing,
        }
      )
    );
  }
}

if (isInstantaneous) {
  setTagMask(
    [
      bibleData.staticBiblePieces.crossVerticalLine,
      bibleData.staticBiblePieces.crossHorizontalLine,
    ],
    dimension + "Z",
    crossNewPositionZ
  );
  setTagMask(
    bibleData.staticBiblePieces.upperCover,
    dimension + "Z",
    isBibleEmpty ? initialPositionZ : nextPositionZ
  );
} else {
  animations.push(
    animateTag(bibleData.staticBiblePieces.upperCover, dimension + "Z", {
      toValue: isBibleEmpty ? initialPositionZ : nextPositionZ,
      duration,
      easing,
    })
  );
}

// await Promise.allSettled(animations);
await Promise.all(animations);

return true;

function IsBibleEmpty() {
  const result = !bibleData.childrenData.some((testamentData) => {
    return testamentData.isSplitIntoSections
      ? testamentData.childrenData.some((sectionData) => {
          return sectionData.isSplitIntoBooks ? true : sectionData.isActive;
        })
      : testamentData.isActive;
  });
  return result;
}

function GetBibleStackStructure() {
  const filteredStructure = bibleData.childrenData.filter((testamentData) => {
    return testamentData.isSplitIntoSections
      ? testamentData.childrenData.some((sectionData) => {
          return sectionData.isSplitIntoBooks ? true : sectionData.isActive;
        })
      : testamentData.isActive;
  });
  return filteredStructure;
}
