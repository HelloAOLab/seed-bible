import { GetBotScales } from "bibleVizUtils.functions.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { CrossPosition } from "bibleVizUtils.models.canvas";
import type { Easing } from "../../../../typings/AuxLibraryDefinitions";

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

const {
  bibleData,
  speedMultiplier,
  isInstantaneous,
}: {
  bibleData: StackBibleData;
  speedMultiplier: number;
  isInstantaneous: boolean;
} = that;
const dimension = os.getCurrentDimension();
const duration = isInstantaneous ? 0 : 0.5 / speedMultiplier;
const easing: Easing = { type: "sinusoidal", mode: "inout" };

const lowerCover = bibleData.getStaticPiece("lowerCover");
const upperCover = bibleData.getStaticPiece("upperCover");
const crossHorizontalLine = bibleData.getStaticPiece("crossHorizontalLine");
const crossVerticalLine = bibleData.getStaticPiece("crossVerticalLine");

if (!lowerCover || !upperCover || !crossHorizontalLine || !crossVerticalLine) {
  console.error(`Static stack pieces not found at UpdateBibleStack`, {
    lowerCover,
    upperCover,
  });
  return;
}

const lowerCoverPosition = getBotPosition(lowerCover, dimension);
const lowerCoverScales = GetBotScales(lowerCover);
const upperCoverScales = GetBotScales(upperCover);
const isBibleEmpty = bibleData.isEmpty();
const isCrossInMiddle = bibleData.areAllTestamentsSplit() && !isBibleEmpty;
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
  ? CrossPosition.Middle
  : CrossPosition.Top;

if (bibleData.currentCrossPosition !== targetCrossPosition) {
  bibleData.changeCrossPosition(targetCrossPosition);

  if (isInstantaneous) {
    setTagMask([crossVerticalLine, crossHorizontalLine], "formOpacity", 1);
  } else {
    animations.push(
      animateTag([crossVerticalLine, crossHorizontalLine], "formOpacity", {
        toValue: 0,
        duration: duration / 2,
        easing,
      }).then(() => {
        setTagMask(
          [crossVerticalLine, crossHorizontalLine],
          dimension + "Z",
          crossNewPositionZ
        );
        return animateTag(
          [crossVerticalLine, crossHorizontalLine],
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
      animateTag([crossVerticalLine, crossHorizontalLine], dimension + "Z", {
        toValue: crossNewPositionZ,
        duration,
        easing,
      })
    );
  }
}

if (isInstantaneous) {
  setTagMask(
    [crossVerticalLine, crossHorizontalLine],
    dimension + "Z",
    crossNewPositionZ
  );
  setTagMask(
    upperCover,
    dimension + "Z",
    isBibleEmpty ? initialPositionZ : nextPositionZ
  );
} else {
  animations.push(
    animateTag(upperCover, dimension + "Z", {
      toValue: isBibleEmpty ? initialPositionZ : nextPositionZ,
      duration,
      easing,
    })
  );
}

// await Promise.allSettled(animations);
await Promise.all(animations);

return true;

function GetBibleStackStructure() {
  // TODO: Move this to StackBibleData
  const filteredStructure = bibleData.childrenData.filter((testamentData) => {
    return testamentData.isSplitIntoSections
      ? testamentData.childrenData.some((sectionData) => {
          return sectionData instanceof StackSectionData &&
            sectionData.isSplitIntoBooks
            ? true
            : sectionData.isActive;
        })
      : testamentData.isActive;
  });
  return filteredStructure;
}
