import { GetBotScales, type Scales } from "bibleVizUtils.functions.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import { BibleType } from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";

/**
 * Animates the elements of the Bible to perform an initial open animation.
 * This is called when the Bible is interacted for the first time.
 *
 * @example
 * thisBot.DisplayInitialBibleOpenAnimation()
 */

shout("OnInitialBibleOpenAnimationStart");
const {
  bibleData,
}: {
  bibleData: StackBibleData;
} = that;
const dimension = os.getCurrentDimension();
const animationDuration =
  bibleData.bibleType === BibleType.PlatformerGame ? 0 : 2;

const lowerCover = bibleData.getStaticPiece("lowerCover");
const upperCover = bibleData.getStaticPiece("upperCover");
const leftCover = bibleData.getStaticPiece("leftCover");
const crossVerticalLine = bibleData.getStaticPiece("crossVerticalLine");
const crossHorizontalLine = bibleData.getStaticPiece("crossHorizontalLine");

if (!lowerCover) {
  console.error("lowerCover not found at DisplayInitialBibleOpenAnimation");
  return;
}

if (!upperCover) {
  console.error("upperCover not found at DisplayInitialBibleOpenAnimation");
  return;
}

if (!leftCover) {
  console.error("leftCover not found at DisplayInitialBibleOpenAnimation");
  return;
}

if (!crossVerticalLine) {
  console.error(
    "crossVerticalLine not found at DisplayInitialBibleOpenAnimation"
  );
  return;
}

if (!crossHorizontalLine) {
  console.error(
    "crossHorizontalLine not found at DisplayInitialBibleOpenAnimation"
  );
  return;
}

const lowerCoverPosition = getBotPosition(lowerCover, dimension);
const lowerCoverScales = GetBotScales(lowerCover);
const testamentsScales: Scales[] = [];
const testamentsPositionZ: number[] = [];
for (
  let testamentIndex = 0;
  testamentIndex < bibleData.childrenData.length;
  testamentIndex++
) {
  const testamentData = bibleData.childrenData[testamentIndex];

  if (!testamentData) {
    throw new Error(
      "testamentData not found at DisplayInitialBibleOpenAnimation"
    );
  }

  if (!testamentData.piece) {
    throw new Error(
      "testamentData.piece not found at DisplayInitialBibleOpenAnimation"
    );
  }

  const scales = GetBotScales(testamentData.piece);
  const positionZ =
    lowerCoverPosition.z +
    lowerCoverScales.z +
    BibleVizDataRepository.getStackSpacing("BetweenArrangements") *
      (testamentIndex + 1) +
    scales.z * testamentIndex;
  testamentsScales.push(scales);
  testamentsPositionZ.push(positionZ);
}
// const testamentsPositionZ = [
//     lowerCoverPosition.z + lowerCoverScales.z + BibleVizDataRepository.getStackSpacing("BetweenArrangements"),
//     lowerCoverPosition.z + lowerCoverScales.z + (BibleVizDataRepository.getStackSpacing("BetweenArrangements")*2) + testamentsScales[0].z
// ];

const lastIndex = bibleData.childrenData.length - 1;
const lastTestamentScales = testamentsScales[lastIndex];
const lastTestamentPositionZ = testamentsPositionZ[lastIndex];

if (!lastTestamentScales) {
  console.error(
    "lastTestamentScales not found at DisplayInitialBibleOpenAnimation"
  );
  return;
}

if (!lastTestamentPositionZ) {
  console.error(
    "lastTestamentPositionZ not found at DisplayInitialBibleOpenAnimation"
  );
  return;
}

const upperCoverPositionZ =
  lastTestamentPositionZ +
  lastTestamentScales.z +
  BibleVizDataRepository.getStackSpacing("BetweenArrangements");
const upperCoverScales = GetBotScales(upperCover);
const crossPositionZ =
  upperCoverPositionZ +
  upperCoverScales.z +
  BibleVizDataRepository.getStackSpacing("CoverToCross");
const animations = [];

bibleData.childrenData.forEach((testamentData, index) => {
  if (!testamentData.piece) {
    throw new Error(
      "testamentData.piece not found at DisplayInitialBibleOpenAnimation"
    );
  }

  setTag(testamentData.piece, "desiredPositionZ", testamentsPositionZ[index]);
  animations.push(
    animateTag(testamentData.piece, dimension + "Z", {
      toValue: testamentsPositionZ[index],
      duration: animationDuration,
      easing: { type: "sinusoidal", mode: "inout" },
    })
  );
});
animations.push(
  animateTag(leftCover, "scaleZ", {
    toValue: 0,
    duration: animationDuration,
    easing: { type: "sinusoidal", mode: "inout" },
  }),
  animateTag(upperCover, dimension + "Z", {
    toValue: upperCoverPositionZ,
    duration: animationDuration,
    easing: { type: "sinusoidal", mode: "inout" },
  }),
  animateTag([crossVerticalLine, crossHorizontalLine], dimension + "Z", {
    toValue: crossPositionZ,
    duration: animationDuration,
    easing: { type: "sinusoidal", mode: "inout" },
  })
);

await Promise.all(animations)
  .then(() => {
    const pieces: Bot[] = bibleData.childrenData.map((testamentData) => {
      if (!testamentData.piece) {
        throw new Error(
          "testamentData.piece not found at DisplayInitialBibleOpenAnimation"
        );
      }
      return testamentData.piece;
    });

    setTagMask(
      pieces,
      "highlightable",
      bibleData.bibleType === BibleType.Default
    );
    setTagMask(
      pieces,
      "draggable",
      bibleData.bibleType === BibleType.Default
        ? BibleStackManager.masks.areBiblePiecesDraggable
        : false
    );
    setTagMask(
      [crossVerticalLine, crossHorizontalLine],
      "pointable",
      bibleData.bibleType === BibleType.Default
    );
    setTag(leftCover, dimension, false);
    return Promise.all(
      shout("OnInitialBibleOpenAnimationCompleted", { bibleData })
    );
  })
  .catch((error) => {
    console.log(error);
    shout("OnInitialBibleOpenAnimationFailed");
  });
