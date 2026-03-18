import {
  GetBotScales,
  GetDarkerColor,
  GetCamRotationFocusPoint,
} from "bibleVizUtils.functions.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { subtractArrays } from "bibleVizUtils.functions.index";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
import {
  BiblePiece,
  BibleType,
  ObjectPoolTags,
} from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import type { Vector3 as Vecor3Type } from "../../../../typings/AuxLibraryDefinitions";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";

/**
 * Handles a testament selection. It modify the data of the selected testament on the bibleStructure,
 * then divides it into sections and resposition the rest of the pieces if needed
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.testament - The testament to divide into sections
 * @example
 * thisBot.SelectTestament({testament});
 */

const {
  testament,
  speedMultiplier = 1,
  isInstantaneous = false,
  source,
}: {
  testament: Bot;
  speedMultiplier?: number;
  isInstantaneous?: boolean;
  source?: string;
} = that;

const testamentData: StackTestamentData | undefined = thisBot.GetPieceData({
  piece: testament,
});

if (!testamentData) {
  console.warn("testamentData not found at SelectTestament");
  return;
}

const {
  bibleData,
}: {
  bibleData: StackBibleData | undefined;
} = await thisBot.GetDataChainFromParentDataIds({
  parentDataIds: testamentData.parentDataIds,
});

const dimension = os.getCurrentDimension();
const animationsDuration = isInstantaneous ? 0 : 1 / speedMultiplier;
const animationsEasing = { type: "sinusoidal", mode: "inout" };
const currentInfoLabelTransformer =
  LabelsRepository.getLabelTransformerByOwner(testament);
const testamentPosition = getBotPosition(testament, dimension);
const testamentScales = GetBotScales(testament);
const sectionInitialScaleZ = 0.1;
const desiredTestamentScale = 1.1;
const desiredTestamentFormOpacity = 0;
let sectionPosition = testamentPosition;
let sectionDesiredPositionZ =
  testamentPosition.z +
  BibleVizDataRepository.getStackSpacing("BetweenSections");
let crossLines: [Bot, Bot] | undefined;
let crossLinesPosition: Vecor3Type | undefined;
let sectionShadows: Bot[] | undefined;
let piecesAboveTestament: Bot[] | undefined;
// const collisionType = bibleData?.bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame ? CollisionType.Collision : null

tryHideNotification(testament);
shout("OnStackTestamentSelected", {
  isFromPlatformerGame:
    bibleData && bibleData.bibleType === BibleType.PlatformerGame,
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
testamentData.split();
testamentData.childrenData.forEach((data) => {
  if (testamentData.isInsideBible) data.attachToBible();
  else data.detachFromBible();
  data.attachToTestament();
});

shout("OnBiblePieceSelected", { piece: testament });

if (bibleData) {
  if (!bibleData.staticBiblePieces) {
    console.warn(`bibleData.staticBiblePieces not defined at SelectTestament`);
    return;
  }
  const verticalLine = bibleData.getStaticPiece("crossVerticalLine");
  const horizontalLine = bibleData.getStaticPiece("crossHorizontalLine");
  if (!verticalLine || !horizontalLine) {
    console.warn(`cross lines not found at SelectTestament`);
    return;
  }
  crossLines = [verticalLine, horizontalLine];
  crossLinesPosition = getBotPosition(crossLines[0], dimension);
  sectionShadows = (thisBot.vars.stackSectionsData as StackSectionData[])
    .filter((currentSectionData) => {
      const bibleId = currentSectionData.getParentId("stackBibleId");
      return (
        currentSectionData.parentDataIds &&
        bibleId === bibleData.id &&
        currentSectionData.shadow &&
        currentSectionData.shadow.tags.isInUse &&
        currentSectionData.shadow.tags[dimension + "Z"] > testamentPosition.z
      );
    })
    .map((currentSectionData) => {
      return currentSectionData.shadow as Bot;
    });
  piecesAboveTestament = [bibleData.getStaticPiece("upperCover")]
    .concat(
      sectionShadows,
      crossLinesPosition.z > testamentPosition.z ? crossLines : [],
      GetPiecesAboveTestament()
    )
    .filter(Boolean) as Bot[];
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
    data.getCreationParam("amountOfChaptersInSection") *
    BibleVizDataRepository.getStackPieceMeasurement(
      "SectionDesiredScaleZRatio"
    );
  const section = ObjectPooler.GetObjectFromPool({
    tag:
      data instanceof StackSectionBookData
        ? ObjectPoolTags.StackBook
        : ObjectPoolTags.StackSection,
  });
  const sectionMod = {
    typeOfPiece:
      data instanceof StackSectionBookData
        ? BiblePiece.StackSectionBook
        : BiblePiece.StackSection,
    arrangementIndex: data.getCreationParam("arrangementIndex"),
    testamentIndex: data.getCreationParam("testamentIndex"),
    sectionIndex: data.getCreationParam("sectionIndex"),
    // sectionKey                  : data.creationParams.sectionKey,
    sectionName: data.pieceInfo.name,
    amountOfChaptersInSection: data.getCreationParam(
      "amountOfChaptersInSection"
    ),
    numberOfChapters:
      data instanceof StackSectionBookData
        ? data.getCreationParam("amountOfChaptersInSection")
        : null,
    bookInfo:
      data instanceof StackSectionBookData
        ? data.getPieceInfoProperty("books")[0]
        : null,
    bookName:
      data instanceof StackSectionBookData
        ? data.getPieceInfoProperty("books")[0]?.commonName
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
    color: data.highlightColor ?? data.getPieceInfoProperty("color"),
    orginalColor: data.getPieceInfoProperty("color"),
    initialColor: data.getPieceInfoProperty("color"),
    initialExplodedViewScaleZ:
      data instanceof StackSectionBookData
        ? null
        : desiredScaleZ *
          (data.getPieceInfoProperty("customExplodedViewScaleFactor") ?? 2),
    desiredExplodedViewScaleZ:
      data instanceof StackSectionBookData
        ? null
        : desiredScaleZ *
          (data.getPieceInfoProperty("customExplodedViewScaleFactor") ?? 2),
    labelOpacity: 0,
    formOpacity: 0.7,
    labelTextColor: GetDarkerColor(data.getPieceInfoProperty("color")),
    transformer: bibleData
      ? bibleData.getStaticPiece("bibleTransformer")?.id
      : null,
    transformerLink: bibleData
      ? `🔗${bibleData.getStaticPiece("bibleTransformer")?.id}`
      : null,
    customColorRange:
      data instanceof StackSectionBookData
        ? null
        : data.pieceInfo.customColorRange,
    draggable: thisBot.masks.areBiblePiecesDraggable,
    desiredPositionZ: sectionDesiredPositionZ,
    desiredScaleZ,
    // collisionType               : (data instanceof StackSectionBookData) ? collisionType : null
  };
  section.OnSpawned({ mod: sectionMod });
  data.setPiece(section);
  data.activate();
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
  const sectionsDesiredScaleZ: number[] = testamentData.childrenData.map(
    (data) => {
      return data.piece?.tags.desiredScaleZ ?? 1;
    }
  );
  const testamentDesiredScaleZ =
    sectionsDesiredScaleZ.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    }) +
    (testamentData.childrenData.length + 1) *
      BibleVizDataRepository.getStackSpacing("BetweenSections");
  const deltaScaleZ = testamentDesiredScaleZ - testamentScales.z;

  const firstAnimationSequence = [];
  if (isInstantaneous) setTagMask(testament, "scaleZ", testamentDesiredScaleZ);
  else {
    const focusOnRotation = { x: 1.01229, y: 0.5 };
    const testamentPosition = getBotPosition(testament, dimension);
    let fixedPosition = new Vector3(
      testamentPosition.x,
      testamentPosition.y,
      testamentPosition.z + testamentDesiredScaleZ / 2
    );
    if (testamentData.getParentId("stackBookId")) {
      const transformerPosition = getBotPosition(
        testament.links.transformerLink as Bot,
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
      animateTag(testament, "scaleZ", {
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
    piecesAboveTestament?.forEach((piece) => {
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
    if (data.piece) {
      setTagMask(data.piece, "scaleZ", data.piece.tags.desiredScaleZ);
      setTagMask(data.piece, dimension + "Z", data.piece.tags.desiredPositionZ);
      setTagMask(data.piece, "highlightable", true);
    }
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

function GetPiecesAboveTestament(): Bot[] {
  const pieces: Bot[] = [];
  if (!bibleData) {
    console.warn(
      "bibleData not defined at SelectTestament.GetPiecesAboveTestament"
    );
    return pieces;
  }
  for (
    let i = testament.tags.testamentIndex + 1;
    i < bibleData.childrenData.length;
    i++
  ) {
    const currentTestamentData = bibleData.childrenData[i];
    if (!currentTestamentData) {
      console.warn(
        "currentTestamentData not found at SelectTestament.GetPiecesAboveTestament"
      );
      continue;
    }
    if (currentTestamentData.isSplitIntoSections) {
      for (const currentSectionData of currentTestamentData.childrenData) {
        if (
          currentSectionData instanceof StackSectionData &&
          currentSectionData.isSplitIntoBooks
        ) {
          for (const currentBookData of currentSectionData.childrenData.flat()) {
            if (currentBookData.isActive) {
              if (currentBookData.piece) pieces.push(currentBookData.piece);
            }
          }
        } else if (currentSectionData.isActive && currentSectionData.piece) {
          pieces.push(currentSectionData.piece);
        }
      }
    } else if (currentTestamentData.isActive && currentTestamentData.piece) {
      pieces.push(currentTestamentData.piece);
    }
  }
  return pieces;
}
