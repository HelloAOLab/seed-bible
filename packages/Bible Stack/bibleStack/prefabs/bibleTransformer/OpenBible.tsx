import { GetBotScales, GetDarkerColor } from "bibleVizUtils.functions.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { ObjectPoolTags } from "bibleVizUtils.models.canvas.models";

/**
 * Opens the Bible by animating its elements and setting their properties based on the provided Bible data.
 * Initializes animations for the sections and adjusts their positions and scales.
 * @param {Object} that - The context containing properties for the Bible opening process.
 * @param {number} [that.duration=0.5] - The duration of the opening animation.
 * @param {Object} [that.easing={type: "sinusoidal", mode: "inout"}] - Easing configuration for the animation.
 * @param {BibleData} that.bibleData - The data related to the Bible being opened.
 * @example
 * bibleTransformer.OpenBible({duration: 1, easing: {type: "linear", mode: "inout"}, bibleData: someBibleData})
 */

const {
  duration = 0.5,
  easing = { type: "sinusoidal", mode: "inout" },
  bibleData,
} = that ?? {};
const dimension = os.getCurrentDimension();
const lowerCoverPosition = getBotPosition(
  bibleData.staticBiblePieces.lowerCover,
  dimension
);
const crossVerticalLineScales = GetBotScales(
  bibleData.staticBiblePieces.crossVerticalLine
);
const sectionInitialScaleZ = 0;
const initialPositionZ =
  lowerCoverPosition.z +
  BibleVizDataRepository.getStackPieceMeasurement("CoverScales").z;
let nextPositionZ =
  initialPositionZ +
  BibleVizDataRepository.getStackSpacing("BetweenArrangements");
const resizeAnimations = [];
bibleData.currentStackVizState =
  BibleVizUtils.Data.tags.BibleVisualizationState.Regular;

for (const testamentData of bibleData.childrenData) {
  nextPositionZ += BibleVizDataRepository.getStackSpacing("BetweenSections");
  for (const sectionData of testamentData.childrenData) {
    const sectionIndex = testamentData.childrenData.indexOf(sectionData);
    const desiredScaleZ =
      sectionData.creationInfo.amountOfChaptersInSection *
      BibleVizDataRepository.getStackPieceMeasurement(
        "SectionDesiredScaleZRatio"
      );

    const section = ObjectPooler.GetObjectFromPool({
      tag:
        sectionData instanceof StackSectionBookData
          ? ObjectPoolTags.StackBook
          : ObjectPoolTags.StackSection,
    });
    const sectionMod = {
      typeOfPiece:
        sectionData instanceof StackSectionBookData
          ? BibleVizUtils.Data.tags.BiblePieceType.StackSectionBook
          : BibleVizUtils.Data.tags.BiblePieceType.StackSection,
      arrangementIndex: sectionData.creationInfo.arrangementIndex,
      testamentIndex: sectionData.creationInfo.testamentIndex,
      sectionIndex: sectionData.creationInfo.sectionIndex,
      sectionName: sectionData.pieceInfo.name,
      amountOfChaptersInSection:
        sectionData.creationInfo.amountOfChaptersInSection,
      numberOfChapters:
        sectionData instanceof StackSectionBookData
          ? sectionData.creationInfo.amountOfChaptersInSection
          : null,
      bookInfo:
        sectionData instanceof StackSectionBookData
          ? sectionData.pieceInfo.books[0]
          : null,
      bookName:
        sectionData instanceof StackSectionBookData
          ? sectionData.pieceInfo.books[0].commonName
          : null,
      [dimension]: true,
      [dimension + "X"]: 0,
      [dimension + "Y"]: 0,
      [dimension + "Z"]: initialPositionZ,
      [dimension + "RotationZ"]: 0,
      scaleX:
        BibleVizDataRepository.getStackPieceMeasurement("SectionScales").x,
      scaleY:
        BibleVizDataRepository.getStackPieceMeasurement("SectionScales").y,
      scaleZ: sectionInitialScaleZ,
      initialScaleX:
        BibleVizDataRepository.getStackPieceMeasurement("SectionScales").x,
      initialScaleY:
        BibleVizDataRepository.getStackPieceMeasurement("SectionScales").y,
      initialScaleZ: desiredScaleZ,
      hoveredScaleX:
        BibleVizDataRepository.getStackPieceMeasurement("SectionScales").x +
        BibleVizDataRepository.getStackPieceMeasurement(
          "SectionAditionalScaleOnHover"
        ),
      hoveredScaleY:
        BibleVizDataRepository.getStackPieceMeasurement("SectionScales").y +
        BibleVizDataRepository.getStackPieceMeasurement(
          "SectionAditionalScaleOnHover"
        ),
      color: sectionData.highlightColor ?? sectionData.pieceInfo.color,
      orginalColor: sectionData.pieceInfo.color,
      initialColor: sectionData.pieceInfo.color,
      strokeColor: "clear",
      initialExplodedViewScaleZ:
        sectionData instanceof StackSectionBookData
          ? null
          : desiredScaleZ *
            (sectionData.pieceInfo.customExplodedViewScaleFactor ?? 2),
      desiredExplodedViewScaleZ:
        sectionData instanceof StackSectionBookData
          ? null
          : desiredScaleZ *
            (sectionData.pieceInfo.customExplodedViewScaleFactor ?? 2),
      labelOpacity: 0,
      formOpacity: 0.7,
      labelTextColor: GetDarkerColor({ color: sectionData.pieceInfo.color }),
      transformer: thisBot.id,
      transformerLink: `🔗${thisBot.id}`,
      customColorRange:
        sectionData instanceof StackSectionBookData
          ? null
          : sectionData.pieceInfo.customColorRange,
      draggable: BibleStackManager.masks.areBiblePiecesDraggable,
      desiredPositionZ: nextPositionZ,
      desiredScaleZ,
      sectionIndex,
    };
    section.OnSpawned({ mod: sectionMod });
    sectionData.piece = section;
    sectionData.isActive = true;
    setTagMask(sectionData.piece, "formOpacity", 0.7);
    setTagMask(sectionData.piece, "highlightable", true);
    if (BibleVizUtils.Data.masks.isInHistoryMode)
      setTagMask(
        section,
        "color",
        BibleVizUtils.Functions.GetHistoryColor({ piece: section })
      );
    resizeAnimations.push(
      animateTag(sectionData.piece, {
        fromValue: {
          [dimension + "Z"]: initialPositionZ,
          scaleZ: sectionInitialScaleZ,
        },
        toValue: {
          [dimension + "Z"]: nextPositionZ,
          scaleZ: desiredScaleZ,
        },
        duration,
        easing,
      })
    );
    nextPositionZ +=
      desiredScaleZ + BibleVizDataRepository.getStackSpacing("BetweenSections");
  }
  nextPositionZ += BibleVizDataRepository.getStackSpacing(
    "BetweenArrangements"
  );
}

const crossOpenedPositionZ =
  bibleData.childrenData[bibleData.childrenData.length - 1].childrenData[0]
    .piece.tags.desiredPositionZ -
  BibleVizDataRepository.getStackSpacing("BetweenArrangements") / 2 -
  BibleVizDataRepository.getStackSpacing("BetweenSections") -
  crossVerticalLineScales.z / 2;
resizeAnimations.push(
  animateTag(bibleData.staticBiblePieces.upperCover, dimension + "Z", {
    toValue: nextPositionZ,
    duration,
    easing: easing,
  }),
  animateTag(
    [
      bibleData.staticBiblePieces.crossVerticalLine,
      bibleData.staticBiblePieces.crossHorizontalLine,
    ],
    dimension + "Z",
    {
      toValue: crossOpenedPositionZ,
      duration,
      easing: easing,
    }
  )
);

await Promise.allSettled(resizeAnimations);

setTagMask(thisBot, "isBibleClosed", false);

const activeBibleElements = getBots(
  byTag("isStackPiece", true),
  byTag(dimension, true)
);
BibleStackManager.TrySetPiecesRenderOrder(activeBibleElements);

return true;
