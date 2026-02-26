import { GetBotScales } from "bibleVizUtils.functions.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

/**
 * Animates the elements of the Bible to perform an initial open animation.
 * This is called when the Bible is interacted for the first time.
 *
 * @example
 * thisBot.DisplayInitialBibleOpenAnimation()
 */

shout("OnInitialBibleOpenAnimationStart");
const { bibleData } = that;
const dimension = os.getCurrentDimension();
const animationDuration =
  bibleData.bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame
    ? 0
    : 2;
const lowerCoverPosition = getBotPosition(
  bibleData.staticBiblePieces.lowerCover,
  dimension
);
const lowerCoverScales = GetBotScales(bibleData.staticBiblePieces.lowerCover);
const testamentsScales = bibleData.childrenData.map((testamentData) => {
  return GetBotScales(testamentData.piece);
});
// const testamentsPositionZ = [
//     lowerCoverPosition.z + lowerCoverScales.z + BibleVizDataRepository.getStackSpacing("BetweenArrangements"),
//     lowerCoverPosition.z + lowerCoverScales.z + (BibleVizDataRepository.getStackSpacing("BetweenArrangements")*2) + testamentsScales[0].z
// ];
const testamentsPositionZ = bibleData.childrenData.map(
  (testamentData, index) => {
    return (
      lowerCoverPosition.z +
      lowerCoverScales.z +
      BibleVizDataRepository.getStackSpacing("BetweenArrangements") *
        (index + 1) +
      testamentsScales[0].z * index
    );
  }
);
const upperCoverPositionZ =
  testamentsPositionZ[testamentsPositionZ.length - 1] +
  testamentsScales[testamentsPositionZ.length - 1].z +
  BibleVizDataRepository.getStackSpacing("BetweenArrangements");
const upperCoverScales = GetBotScales(bibleData.staticBiblePieces.upperCover);
const crossPositionZ =
  upperCoverPositionZ +
  upperCoverScales.z +
  BibleVizDataRepository.getStackSpacing("CoverToCross");
const animations = [];

bibleData.childrenData.forEach((testamentData, index) => {
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
  animateTag(bibleData.staticBiblePieces.leftCover, "scaleZ", {
    toValue: 0,
    duration: animationDuration,
    easing: { type: "sinusoidal", mode: "inout" },
  }),
  animateTag(bibleData.staticBiblePieces.upperCover, dimension + "Z", {
    toValue: upperCoverPositionZ,
    duration: animationDuration,
    easing: { type: "sinusoidal", mode: "inout" },
  }),
  animateTag(
    [
      bibleData.staticBiblePieces.crossVerticalLine,
      bibleData.staticBiblePieces.crossHorizontalLine,
    ],
    dimension + "Z",
    {
      toValue: crossPositionZ,
      duration: animationDuration,
      easing: { type: "sinusoidal", mode: "inout" },
    }
  )
);

await Promise.all(animations)
  .then(() => {
    setTagMask(
      bibleData.childrenData.map((testamentData) => {
        return testamentData.piece;
      }),
      "highlightable",
      bibleData.bibleType === BibleVizUtils.Data.tags.BibleType.Default
    );
    setTagMask(
      bibleData.childrenData.map((testamentData) => {
        return testamentData.piece;
      }),
      "draggable",
      bibleData.bibleType === BibleVizUtils.Data.tags.BibleType.Default
        ? BibleStackManager.masks.areBiblePiecesDraggable
        : false
    );
    setTagMask(
      [
        bibleData.staticBiblePieces.crossVerticalLine,
        bibleData.staticBiblePieces.crossHorizontalLine,
      ],
      "pointable",
      bibleData.bibleType === BibleVizUtils.Data.tags.BibleType.Default
    );
    setTag(bibleData.staticBiblePieces.leftCover, dimension, false);
    return Promise.all(
      shout("OnInitialBibleOpenAnimationCompleted", { bibleData })
    );
  })
  .catch((error) => {
    console.log(error);
    shout("OnInitialBibleOpenAnimationFailed");
  });
