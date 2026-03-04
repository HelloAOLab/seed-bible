import {
  GetBotScales,
  GetDarkerColor,
  GetCamRotationFocusPoint,
} from "bibleVizUtils.functions.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { subtractArrays } from "bibleVizUtils.functions.index";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";

/**
 * Handles a testament selection. It modify the data of the selected testament on the bibleStructure,
 * then divides it into sections and resposition the rest of the pieces if needed
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.testament - The testament to divide into sections
 * @example
 * thisBot.SelectTestament({testament});
 */

const { testament, speedMultiplier = 1, isInstantaneous = false } = that;
const testamentData = thisBot.GetPieceData({ piece: testament });
const { bibleData } = thisBot.GetDataChainFromParentDataIds({
  parentDataIds: testamentData.parentDataIds,
});
const dimension = os.getCurrentDimension();
const animationsDuration = isInstantaneous ? 0 : 1 / speedMultiplier;
const animationsEasing = { type: "sinusoidal", mode: "inout" };
const currentInfoLabelTransformer = getBot(
  byTag("isInfoLabelTransformer", true),
  byTag("ownerBotId", getID(testamentData.piece))
);
const testamentPosition = getBotPosition(testament, dimension);
const testamentScales = GetBotScales(testament);
const sectionInitialScaleZ = 0.1;
const desiredTestamentScale = 1.1;
const desiredTestamentFormOpacity = 0;
let sectionPosition = testamentPosition;
let sectionDesiredPositionZ =
  testamentPosition.z +
  BibleVizDataRepository.getStackSpacing("BetweenSections");
let crossLines;
let crossLinesPosition;
let sectionShadows;
let piecesAboveTestament;
// const collisionType = bibleData?.bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame ? CollisionType.Collision : null

tryHideNotification(testament);
shout("OnStackTestamentSelected", {
  isFromPlatformerGame:
    bibleData &&
    bibleData.bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame,
});
setTagMask(thisBot, "isBibleAnimating", true);
if (thisBot.vars.highlightedPieces.length > 0 && bibleData) {
  const piecesToUnhighlight = thisBot.vars.highlightedPieces
    .map((piece) => {
      return thisBot.GetPieceData({ piece });
    })
    .filter((pieceData) => {
      return (
        pieceData.parentDataIds.stackBibleId &&
        pieceData.parentDataIds.stackBibleId === bibleData.id &&
        !pieceData.piece.masks.isOnTheGround &&
        !pieceData.piece.masks.isUnhighlighting
      );
    })
    .map((pieceData) => {
      return pieceData.piece;
    });
  if (piecesToUnhighlight.length > 0) {
    await Promise.all(
      piecesToUnhighlight.map((piece) => {
        return thisBot.TryUnhighlightPiece({
          source: "SelectTestament",
          speedMultiplier,
          piece,
          tryUpdateActivityNotification:
            piece.id == testament.id ? false : true,
          requestSource: BibleVizUtils.Data.tags.InteractionType.Transition,
        });
      })
    );
    thisBot.vars.highlightedPieces = subtractArrays(
      thisBot.vars.highlightedPieces,
      piecesToUnhighlight
    );
  }
}
thisBot.vars.lastInteractedStackTestamentData = testamentData;
testamentData.isSplitIntoSections = true;
testamentData.childrenData.forEach((data) => {
  data.isInsideBible = testamentData.isInsideBible;
  data.isInsideTestament = true;
});

shout("OnBiblePieceSelected", { piece: testament });

if (bibleData) {
  crossLines = [
    bibleData.staticBiblePieces.crossVerticalLine,
    bibleData.staticBiblePieces.crossHorizontalLine,
  ];
  crossLinesPosition = getBotPosition(crossLines[0], dimension);
  sectionShadows = thisBot.vars.stackSectionsData
    .filter((currentSectionData) => {
      return (
        currentSectionData.parentDataIds.stackBibleId === bibleData.id &&
        currentSectionData.shadow &&
        currentSectionData.shadow.tags.isInUse &&
        currentSectionData.shadow.tags[dimension + "Z"] > testamentPosition.z
      );
    })
    .map((currentSectionData) => {
      return currentSectionData.shadow;
    });
  piecesAboveTestament = [bibleData.staticBiblePieces.upperCover].concat(
    sectionShadows,
    crossLinesPosition.z > testamentPosition.z ? crossLines : [],
    GetPiecesAboveTestament()
  );
  sectionPosition = new Vector3(0, 0, testamentPosition.z);
}
if (currentInfoLabelTransformer) {
  await currentInfoLabelTransformer.Hide({ isInstantaneous }).then(() => {
    ObjectPooler.ReleaseObject({
      obj: currentInfoLabelTransformer,
      tag: currentInfoLabelTransformer.tags.poolTag,
    });
  });
}

for (const data of testamentData.childrenData) {
  const sectionIndex = testamentData.childrenData.indexOf(data);
  const desiredScaleZ =
    data.creationInfo.amountOfChaptersInSection *
    BibleVizDataRepository.getStackPieceMeasurement(
      "SectionDesiredScaleZRatio"
    );
  const section = ObjectPooler.GetObjectFromPool({
    tag:
      data instanceof StackSectionBookData
        ? BibleVizUtils.Data.tags.ObjectPoolTags.StackBook
        : BibleVizUtils.Data.tags.ObjectPoolTags.StackSection,
  });
  const sectionMod = {
    typeOfPiece:
      data instanceof StackSectionBookData
        ? BibleVizUtils.Data.tags.BiblePieceType.StackSectionBook
        : BibleVizUtils.Data.tags.BiblePieceType.StackSection,
    arrangementIndex: data.creationInfo.arrangementIndex,
    testamentIndex: data.creationInfo.testamentIndex,
    sectionIndex: data.creationInfo.sectionIndex,
    // sectionKey                  : data.creationInfo.sectionKey,
    sectionName: data.pieceInfo.name,
    amountOfChaptersInSection: data.creationInfo.amountOfChaptersInSection,
    numberOfChapters:
      data instanceof StackSectionBookData
        ? data.creationInfo.amountOfChaptersInSection
        : null,
    bookInfo:
      data instanceof StackSectionBookData ? data.pieceInfo.books[0] : null,
    bookName:
      data instanceof StackSectionBookData
        ? data.pieceInfo.books[0].commonName
        : null,
    [dimension]: true,
    [dimension + "X"]: sectionPosition.x,
    [dimension + "Y"]: sectionPosition.y,
    [dimension + "Z"]: sectionPosition.z,
    [dimension + "RotationZ"]: 0,
    scaleX: BibleVizDataRepository.getStackPieceMeasurement("SectionScales").x,
    scaleY: BibleVizDataRepository.getStackPieceMeasurement("SectionScales").y,
    scaleZ: sectionInitialScaleZ,
    initialScaleX:
      BibleVizDataRepository.getStackPieceMeasurement("SectionScales").x,
    initialScaleY:
      BibleVizDataRepository.getStackPieceMeasurement("SectionScales").y,
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
    initialScaleZ: desiredScaleZ,
    color: data.highlightColor ?? data.pieceInfo.color,
    orginalColor: data.pieceInfo.color,
    initialColor: data.pieceInfo.color,
    initialExplodedViewScaleZ:
      data instanceof StackSectionBookData
        ? null
        : desiredScaleZ * (data.pieceInfo.customExplodedViewScaleFactor ?? 2),
    desiredExplodedViewScaleZ:
      data instanceof StackSectionBookData
        ? null
        : desiredScaleZ * (data.pieceInfo.customExplodedViewScaleFactor ?? 2),
    labelOpacity: 0,
    formOpacity: 0.7,
    labelTextColor: GetDarkerColor({ color: data.pieceInfo.color }),
    transformer: bibleData
      ? bibleData.staticBiblePieces.bibleTransformer.id
      : null,
    transformerLink: bibleData
      ? `🔗${bibleData.staticBiblePieces.bibleTransformer.id}`
      : null,
    customColorRange:
      data instanceof StackSectionBookData
        ? null
        : data.pieceInfo.customColorRange,
    draggable: thisBot.masks.areBiblePiecesDraggable,
    desiredPositionZ: sectionDesiredPositionZ,
    desiredScaleZ,
    sectionIndex,
    // collisionType               : (data instanceof StackSectionBookData) ? collisionType : null
  };
  section.OnSpawned({ mod: sectionMod });
  data.piece = section;
  data.isActive = true;
  sectionDesiredPositionZ +=
    BibleVizDataRepository.getStackSpacing("BetweenSections") +
    sectionMod.desiredScaleZ;
  if (BibleVizUtils.Data.masks.isInHistoryMode)
    setTagMask(
      section,
      "color",
      BibleVizUtils.Functions.GetHistoryColor({ piece: section })
    );
}

const activeBiblePieces = getBots(
  byTag("isStackPiece", true),
  byTag("isInUse", true)
);
try {
  const sectionsDesiredScaleZ = testamentData.childrenData.map((data) => {
    return data.piece.tags.desiredScaleZ;
  });
  const testamentDesiredScaleZ =
    sectionsDesiredScaleZ.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    }) +
    (testamentData.childrenData.length + 1) *
      BibleVizDataRepository.getStackSpacing("BetweenSections");
  const deltaScaleZ = testamentDesiredScaleZ - testamentScales.z;

  const firstAnimationSequence = [];
  if (isInstantaneous)
    setTagMask(testamentData.piece, "scaleZ", testamentDesiredScaleZ);
  else {
    const focusOnRotation = { x: 1.01229, y: 0.5 };
    const testamentPosition = getBotPosition(testamentData.piece, dimension);
    let fixedPosition = new Vector3(
      testamentPosition.x,
      testamentPosition.y,
      testamentPosition.z + testamentDesiredScaleZ / 2
    );
    if (testamentData.parentDataIds.stackBibleId) {
      const transformerPosition = getBotPosition(
        testamentData.piece.links.transformerLink,
        dimension
      );
      fixedPosition = fixedPosition.add(transformerPosition);
    }
    const desiredFocusOnPosition = GetCamRotationFocusPoint({
      theta: focusOnRotation.y,
      phi: focusOnRotation.x,
      botPosition: fixedPosition,
    });

    firstAnimationSequence.push(
      animateTag(testamentData.piece, "scaleZ", {
        toValue: testamentDesiredScaleZ,
        duration: animationsDuration,
        easing: animationsEasing,
      }),
      os.focusOn(
        { x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y },
        {
          duration: animationsDuration,
          easing: { type: "sinusoidal", mode: "inout" },
          rotation: focusOnRotation,
          zoom: 8,
        }
      )
    );
  }

  if (bibleData) {
    piecesAboveTestament.forEach((piece) => {
      const piecePosition = getBotPosition(piece, dimension);
      const pieceDesiredPositionZ = piecePosition.z + deltaScaleZ;
      if (piece.tags.isStackPiece)
        setTag(piece, "desiredPositionZ", pieceDesiredPositionZ);
      if (isInstantaneous)
        setTagMask(piece, dimension + "Z", pieceDesiredPositionZ);
      else
        firstAnimationSequence.push(
          animateTag(piece, dimension + "Z", {
            toValue: pieceDesiredPositionZ,
            duration: animationsDuration,
            easing: animationsEasing,
          })
        );
    });
  }

  if (!isInstantaneous) await Promise.allSettled(firstAnimationSequence);

  testamentData.childrenData.forEach((data) => {
    setTagMask(data.piece, "scaleZ", data.piece.tags.desiredScaleZ);
    setTagMask(data.piece, dimension + "Z", data.piece.tags.desiredPositionZ);
    setTagMask(data.piece, "highlightable", true);
  });
  thisBot.TrySetPiecesRenderOrder(activeBiblePieces);
  if (isInstantaneous) {
    setTagMask(testament, "scale", desiredTestamentScale);
    setTagMask(testament, "formOpacity", desiredTestamentFormOpacity);
  } else {
    await animateTag(testament, {
      fromValue: {
        scale: testament.tags.scale,
        formOpacity: testament.tags.formOpacity,
      },
      toValue: {
        scale: desiredTestamentScale,
        formOpacity: desiredTestamentFormOpacity,
      },
      duration: animationsDuration,
      easing: animationsEasing,
    });
  }
} catch (error) {
  console.error(error);
}

thisBot.TrySetPiecesRenderOrder(activeBiblePieces);
setTagMask(testament, "color", "clear");
setTagMask(testament, "pointable", false);

return Promise.all(
  shout("OnTestamentSelectionAnimationComplete", {
    testamentData,
    speedMultiplier,
    isInstantaneous,
  })
);

function GetPiecesAboveTestament() {
  const pieces = [];
  for (
    let i = testament.tags.testamentIndex + 1;
    i < bibleData.childrenData.length;
    i++
  ) {
    const currentTestamentData = bibleData.childrenData[i];
    if (currentTestamentData.isSplitIntoSections) {
      for (const currentSectionData of currentTestamentData.childrenData) {
        if (currentSectionData.isSplitIntoBooks) {
          for (const currentBookData of currentSectionData.childrenData.flat()) {
            if (currentBookData.isActive) {
              pieces.push(currentBookData.piece);
            }
          }
        } else if (currentSectionData.isActive) {
          pieces.push(currentSectionData.piece);
        }
      }
    } else if (currentTestamentData.isActive) {
      pieces.push(currentTestamentData.piece);
    }
  }
  return pieces;
}
