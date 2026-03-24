import { type RGB } from "bibleVizUtils.models.commonTypes";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import {
  GetCamRotationFocusPoint,
  applySetTag,
  HexToRgb,
  RgbToHex,
  computeAnimateTag,
} from "bibleVizUtils.functions.index";
import { subtractArrays } from "bibleVizUtils.functions.index";
import { tryHideNotification } from "bibleVizUtils.controllers.userPresence.activityNotificationController";
import { StackGeometryMapper } from "bibleVizUtils.mappers.StackGeometryMapper";
import type { SetTagData } from "bibleVizUtils.models.casualos";
import type { Bot, Easing } from "../../../../typings/AuxLibraryDefinitions";
import {
  BookShape,
  BibleVisualizationState,
  type BookLayout,
  BiblePiece,
} from "bibleVizUtils.models.canvas";
import { ObjectPoolTags } from "bibleVizUtils.models.canvas";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
import type { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import {
  CanvasInteractions,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";

/**
 * Handles a section selection. It modify the data of the selected section on the bibleStructure,
 * then divides it into books and resposition the rest of the pieces if needed
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.section - The section to divide intobooks
 * @example
 * thisBot.SelectSection({section});
 */

const {
  section,
  speedMultiplier = 1,
  isInstantaneous = false,
  skipTourGuide = false,
} = that;
const sectionData: StackSectionData | undefined = thisBot.GetPieceData({
  piece: section,
});

if (!sectionData) {
  console.error("sectionData not found at SelectSection");
  return;
}

const {
  bibleData,
  testamentData,
}: {
  bibleData: StackBibleData | undefined;
  testamentData: StackTestamentData | undefined;
} = await thisBot.GetDataChainFromParentDataIds({
  parentDataIds: sectionData.parentDataIds,
});
const dimension = os.getCurrentDimension();
const easeInOutSine: Easing = { type: "sinusoidal", mode: "inout" };
const currentColorRGB = HexToRgb({
  hexColor: sectionData.highlightColor ?? section.tags.orginalColor,
});
const colorRangeSize = sectionData.pieceInfo.customColorRange ?? 70;
const levelsColorRange: { min: RGB; max: RGB } = {
  min: [
    Math.max(currentColorRGB[0] - colorRangeSize, 0),
    Math.max(currentColorRGB[1] - colorRangeSize, 0),
    Math.max(currentColorRGB[2] - colorRangeSize, 0),
  ],
  max: [
    Math.min(currentColorRGB[0] + colorRangeSize, 255),
    Math.min(currentColorRGB[1] + colorRangeSize, 255),
    Math.min(currentColorRGB[2] + colorRangeSize, 255),
  ],
};
const sectionAvailableSpace =
  section.tags.desiredScaleZ -
  BibleVizDataRepository.getStackSpacing("BetweenBooks") *
    (sectionData.childrenData.length + 1);
const firstSequenceAnimationsObjects: SetTagData[] = [];
const secondSequenceAnimationsObjects: SetTagData[] = [];
const thirdSequenceAnimations: Promise<void>[] = [];
const cameraFocusDuration = 1;
const firstSequenceAnimationDuration = isInstantaneous
  ? 0
  : 0.4 / speedMultiplier;
const secondSequenceAnimationDuration = isInstantaneous
  ? 0
  : 0.4 / speedMultiplier;
const levelsColors = [];
const deltaRed = Math.floor(
  (levelsColorRange.max[0] - levelsColorRange.min[0]) /
    sectionData.childrenData.length
);
const deltaGreen = Math.floor(
  (levelsColorRange.max[1] - levelsColorRange.min[1]) /
    sectionData.childrenData.length
);
const deltaBlue = Math.floor(
  (levelsColorRange.max[2] - levelsColorRange.min[2]) /
    sectionData.childrenData.length
);
const timeBetweenBookAnimation = isInstantaneous ? 0 : 50 / speedMultiplier;
let bookDesiredPositionZOnRegularView;
let bookDesiredPositionZ;
let bookInitialPositionZ;
const bookScalesOnMod = { x: 0.1, y: 0.1, z: 0.1 };
let piecesAboveSection = GetPiecesAboveSection();
const previousExplodedViewSectionData: StackSectionData | undefined =
  bibleData || testamentData
    ? await thisBot.GetPreviousExplodedViewSectionData({
        bibleData,
        testamentData,
      })
    : null;
// const collisionType = bibleData?.bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame ? CollisionType.Collision : null;
tryHideNotification(section);
setTagMask(thisBot, "isBibleAnimating", true);
shout("OnStackSectionSelected");
thisBot.PlaySound({ soundName: "SectionOpen" });
if (thisBot.vars.highlightedPieces.length > 0) {
  const piecesToUnhighlight: Bot[] =
    bibleData || testamentData
      ? (thisBot.vars.highlightedPieces as Bot[])
          .map((piece) => {
            return thisBot.GetPieceData({ piece }) as
              | StackTestamentData
              | StackSectionData
              | StackSectionBookData
              | StackBookData
              | StackChapterData
              | undefined;
          })
          .filter((pieceData) => {
            return (
              pieceData &&
              pieceData.piece &&
              !pieceData.piece.masks.isOnTheGround &&
              !pieceData.piece.masks.isUnhighlighting &&
              ((bibleData &&
                pieceData.getParentId("stackBibleId") &&
                pieceData.getParentId("stackBibleId") === bibleData.id) ||
                (pieceData.getParentId("stackTestamentId") &&
                  pieceData.getParentId("stackTestamentId") ===
                    testamentData?.id))
            );
          })
          .map((pieceData) => {
            return pieceData?.piece as Bot;
          })
      : [section];
  if (piecesToUnhighlight.length > 0) {
    await Promise.all(
      piecesToUnhighlight.map((piece) => {
        return thisBot.TryUnhighlightPiece({
          isInstantaneous,
          piece,
          tryUpdateActivityNotification: piece.id == section.id ? false : true,
          requestSource: CanvasInteractions.Transition,
        });
      })
    );
    thisBot.vars.highlightedPieces = subtractArrays(
      thisBot.vars.highlightedPieces,
      piecesToUnhighlight
    );
  }
}
if (
  previousExplodedViewSectionData &&
  (!bibleData ||
    bibleData.currentStackVizState === BibleVisualizationState.Regular)
) {
  previousExplodedViewSectionData.implode();
  await thisBot.UpdateStacks({ speedMultiplier, isInstantaneous });
}
const sectionPosition = getBotPosition(section, dimension);
sectionData.split();
sectionData.explode();
thisBot.vars.lastInteractedStackSectionData = sectionData;
sectionData.childrenData.flat().forEach((bookData) => {
  if (sectionData.isInsideBible) bookData.attachToBible();
  else bookData.detachFromBible();
  if (sectionData.isInsideTestament) bookData.attachToTestament();
  else bookData.detachFromTestament();
  bookData.attachToSection();
});
shout("OnBiblePieceSelected", { piece: section });

if (bibleData || testamentData) {
  const sectionShadows: Bot[] =
    bibleData || testamentData
      ? (thisBot.vars.stackSectionsData as StackSectionData[])
          .filter((currentSectionData) => {
            const currBibleId = currentSectionData.getParentId("stackBibleId");
            const currTestamentId =
              currentSectionData.getParentId("stackTestamentId");
            return (
              (bibleData
                ? currBibleId
                  ? currBibleId === bibleData.id
                  : false
                : currTestamentId && testamentData
                  ? currTestamentId === testamentData.id
                  : false) &&
              currentSectionData.shadow &&
              currentSectionData.shadow.tags.isInUse &&
              currentSectionData.shadow.tags[dimension + "Z"] >
                sectionPosition.z
            );
          })
          .map((currentSectionData) => {
            return currentSectionData.shadow as Bot;
          })
      : [];
  piecesAboveSection = piecesAboveSection.concat(sectionShadows);
  if (bibleData) {
    const verticalLine = bibleData.getStaticPiece("crossVerticalLine");
    const horizontalLine = bibleData.getStaticPiece("crossHorizontalLine");
    const upperCover = bibleData.getStaticPiece("upperCover");
    if (upperCover) {
      piecesAboveSection.push(upperCover);
    }
    if (verticalLine && horizontalLine) {
      const crossLinesPosition = getBotPosition(verticalLine, dimension);
      if (crossLinesPosition && crossLinesPosition.z > sectionPosition.z) {
        piecesAboveSection.push(verticalLine, horizontalLine);
      }
    }
  }
}

firstSequenceAnimationsObjects.push({
  bot: section,
  tag: dimension + "RotationZ",
  options: {
    toValue: -0.05235988,
    duration: firstSequenceAnimationDuration / 4,
    easing: { type: "sinusoidal", mode: "in" },
  },
  then: {
    bot: section,
    tag: dimension + "RotationZ",
    options: {
      toValue: 0.1308997,
      duration: firstSequenceAnimationDuration / 4,
      easing: { type: "sinusoidal", mode: "out" },
    },
    then: {
      bot: section,
      tag: dimension + "RotationZ",
      options: {
        toValue: -0.05235988,
        duration: firstSequenceAnimationDuration / 4,
        easing: { type: "sinusoidal", mode: "out" },
      },
      then: {
        bot: section,
        tag: dimension + "RotationZ",
        options: {
          toValue: 0,
          duration: firstSequenceAnimationDuration / 4,
          easing: { type: "sinusoidal", mode: "out" },
        },
      },
    },
  },
});

const sectionNewPositionZ =
  sectionPosition.z +
  (section.masks.isOnTheGround
    ? 0
    : BibleVizDataRepository.getStackSpacing("ExplodedViewSectionPadding"));
if (sectionData.isInExplodedView) {
  const deltaScaleZ =
    section.tags.desiredExplodedViewScaleZ - section.tags.desiredScaleZ;
  let pieceCurrentPosition, pieceNewPositionZ;
  setTag(section, "desiredPositionZ", sectionNewPositionZ);
  firstSequenceAnimationsObjects.push({
    bot: section,
    tag: dimension + "Z",
    options: {
      toValue: sectionNewPositionZ,
      duration: firstSequenceAnimationDuration,
      easing: easeInOutSine,
    },
  });
  piecesAboveSection.forEach((piece) => {
    pieceCurrentPosition = getBotPosition(piece, dimension);
    pieceNewPositionZ =
      pieceCurrentPosition.z +
      deltaScaleZ +
      BibleVizDataRepository.getStackSpacing("ExplodedViewSectionPadding") * 2;
    if (piece.tags.isStackPiece)
      setTag(piece, "desiredPositionZ", pieceNewPositionZ);
    firstSequenceAnimationsObjects.push({
      bot: piece,
      tag: dimension + "Z",
      options: {
        toValue: pieceNewPositionZ,
        duration: firstSequenceAnimationDuration,
        easing: easeInOutSine,
      },
    });
  });
} else {
  bookDesiredPositionZOnRegularView =
    section.tags.desiredPositionZ +
    BibleVizDataRepository.getStackSpacing("BetweenBooks");
}

firstSequenceAnimationsObjects.push({
  bot: section,
  tag: "scaleZ",
  options: {
    toValue: section.tags.desiredExplodedViewScaleZ,
    duration: firstSequenceAnimationDuration,
    easing: easeInOutSine,
  },
});
secondSequenceAnimationsObjects.push({
  bot: section,
  tag: "formOpacity",
  options: {
    toValue: 0,
    duration: secondSequenceAnimationDuration,
    easing: { type: "sinusoidal", mode: "out" },
  },
});

try {
  if (isInstantaneous)
    firstSequenceAnimationsObjects.forEach((setTagObject) => {
      applySetTag(setTagObject);
    });
  else {
    const focusOnRotation = { x: 1.01229, y: 0.5 };
    const sectionPosition = getBotPosition(section, dimension);
    let fixedPosition = new Vector3(
      sectionPosition.x,
      sectionPosition.y,
      sectionNewPositionZ + section.tags.desiredExplodedViewScaleZ / 2
    );
    if (sectionData.getParentId("stackBibleId")) {
      const transformerPosition = getBotPosition(
        section.links.transformerLink,
        dimension
      );
      fixedPosition = fixedPosition.add(transformerPosition);
    }
    const desiredFocusOnPosition = GetCamRotationFocusPoint({
      theta: focusOnRotation.y,
      phi: focusOnRotation.x,
      botPosition: fixedPosition,
    });

    await Promise.allSettled([
      ...firstSequenceAnimationsObjects.map((animateTagObject) => {
        return computeAnimateTag(animateTagObject);
      }),
      os.focusOn(
        { x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y },
        {
          duration: cameraFocusDuration,
          easing: { type: "sinusoidal", mode: "inout" },
          rotation: focusOnRotation,
          zoom: 8,
        }
      ),
    ]);
  }

  if (isInstantaneous)
    secondSequenceAnimationsObjects.forEach((setTagObject) => {
      applySetTag(setTagObject);
    });
  else
    await Promise.all(
      secondSequenceAnimationsObjects.map((animateTagObject) => {
        return computeAnimateTag(animateTagObject);
      })
    );

  setTagMask(section, "color", "clear");
  setTagMask(section, "pointable", false);
} catch (error) {
  console.error(error);
}

for (let i = 0; i < sectionData.childrenData.length; i++) {
  const levelColorRGB: RGB = [
    levelsColorRange.min[0] + deltaRed * i,
    levelsColorRange.min[1] + deltaGreen * i,
    levelsColorRange.min[2] + deltaBlue * i,
  ];
  const levelColorHex = RgbToHex({
    rgbColor: levelColorRGB,
  });
  levelsColors.push(levelColorHex);
}

for (const bookDataArr of sectionData.childrenData) {
  const bookDataIndex = sectionData.childrenData.indexOf(bookDataArr);
  let percentageOfLevelInSection: number | undefined;
  let levelScaleZ;
  const amountOfChaptersInLevel = bookDataArr.reduce((total, bookData) => {
    const bookName = bookData.getPieceInfoProperty("commonName");
    const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(bookName);
    if (!bookStaticInfo) {
      console.error("bookStaticInfo not found at SelectSection");
      return total;
    }

    return total + bookStaticInfo.numberOfChapters;
  }, 0);
  const layout: BookLayout[] | undefined = thisBot.GetLayoutForBooksGroup({
    amountOfBooks: bookDataArr.length,
  });
  for (const bookData of bookDataArr) {
    const bookName = bookData.getPieceInfoProperty("commonName");
    const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(bookName);
    if (!bookStaticInfo) {
      console.error("bookStaticInfo not found at SelectSection");
      continue;
    }
    const { numberOfChapters } = bookStaticInfo;
    let groupBookScales, groupBookPosition, groupBookLayoutPosition;
    percentageOfLevelInSection =
      amountOfChaptersInLevel / section.tags.amountOfChaptersInSection;
    levelScaleZ = percentageOfLevelInSection * sectionAvailableSpace;
    bookDesiredPositionZ = sectionData.isInExplodedView
      ? section.tags.desiredPositionZ +
        (bookData.getPieceInfoProperty("explodedViewPosition")?.z ?? 0) *
          section.tags.desiredExplodedViewScaleZ -
        levelScaleZ / 2 +
        (section.masks.isOnTheGround
          ? BibleVizDataRepository.getStackSpacing(
              "ExplodedViewSectionShadowPadding"
            )
          : 0)
      : bookDesiredPositionZOnRegularView;
    bookInitialPositionZ = sectionData.isInExplodedView
      ? section.tags.desiredPositionZ +
        section.tags.desiredExplodedViewScaleZ / 2
      : bookDesiredPositionZ + 1;
    if (bookData.getPieceInfoProperty("group")) {
      const groupBookIndex = bookDataArr.indexOf(bookData);
      const bookLayout = layout?.[groupBookIndex];
      if (!bookLayout) {
        console.error("bookLayout not found at SelectSection");
        continue;
      }
      ({
        scale: groupBookScales,
        position: groupBookPosition,
        layoutPosition: groupBookLayoutPosition,
      } = StackGeometryMapper.computeGroupBookProperties(
        bookLayout,
        sectionPosition,
        BibleVizDataRepository.getStackPieceMeasurement("BookScales"),
        BibleVizDataRepository.getStackSpacing("BetweenBooks")
      ));
    }
    const book = ObjectPooler.GetObjectFromPool({
      tag: ObjectPoolTags.StackBook,
    });
    const bookMod = {
      [dimension]: true,
      [dimension + "X"]: groupBookPosition?.x ?? sectionPosition.x,
      [dimension + "Y"]: groupBookPosition?.y ?? sectionPosition.y,
      [dimension + "Z"]: bookInitialPositionZ,
      typeOfPiece: BiblePiece.StackBook,
      bookIndex: bookData.getCreationParam("levelIndex"),
      isStackPiece: true,
      arrangementIndex: bookData.getCreationParam("arrangementIndex"),
      testamentIndex: bookData.getCreationParam("testamentIndex"),
      sectionIndex: bookData.getCreationParam("sectionIndex"),
      // sectionName                  : bookData.creationParams.sectionKey,
      bookName: bookData.getPieceInfoProperty("commonName"),
      label: bookData.getPieceInfoProperty("commonName"),
      labelColor:
        bookData.getCreationParam("levelIndex") <
        Math.floor(bookData.getCreationParam("levelsLenght") / 2)
          ? "#FFFFFF"
          : "#000000",
      labelOpacity: 0,
      numberOfChapters,
      explodedViewPosition: bookData.getPieceInfoProperty(
        "explodedViewPosition"
      ),
      explodedViewCustomScale:
        bookData.getPieceInfoProperty("explodedViewCustomScale") ?? null,
      isGroupBook: bookData.getPieceInfoProperty("group") ? true : null,
      groupId: bookData.getPieceInfoProperty("group") ?? null,
      groupBookIndex: bookData.getPieceInfoProperty("group")
        ? bookData.getCreationParam("bookLevelIndex")
        : null,
      draggable: thisBot.masks.areBiblePiecesDraggable,
      layoutPositionX: groupBookLayoutPosition?.x,
      layoutPositionY: groupBookLayoutPosition?.y,
      desiredPositionZ: bookDesiredPositionZ,
      scaleX: bookScalesOnMod.x,
      scaleY: bookScalesOnMod.y,
      scaleZ: bookScalesOnMod.z,
      initialScaleX:
        groupBookScales?.x ??
        BibleVizDataRepository.getStackPieceMeasurement("BookScales").x,
      initialScaleY:
        groupBookScales?.y ??
        BibleVizDataRepository.getStackPieceMeasurement("BookScales").y,
      initialScaleZ: levelScaleZ,
      hoveredScaleX:
        (groupBookScales?.x ??
          BibleVizDataRepository.getStackPieceMeasurement("BookScales").x) +
        BibleVizDataRepository.getStackPieceMeasurement(
          "AditionalBookScaleOnHover"
        ),
      hoveredScaleY:
        (groupBookScales?.y ??
          BibleVizDataRepository.getStackPieceMeasurement("BookScales").y) +
        BibleVizDataRepository.getStackPieceMeasurement(
          "AditionalBookScaleOnHover"
        ),
      desiredScaleZ: levelScaleZ,
      transformer: bibleData
        ? bibleData.getStaticPiece("bibleTransformer")?.id
        : null,
      transformerLink: bibleData
        ? `🔗${bibleData.getStaticPiece("bibleTransformer")?.id}`
        : null,
      color:
        bookData.getPieceInfoProperty("customColor") ??
        levelsColors[bookDataIndex],
      strokeColor: "clear",
      orginalColor:
        bookData.getPieceInfoProperty("customColor") ??
        levelsColors[bookDataIndex],
      initialColor:
        bookData.getPieceInfoProperty("customColor") ??
        levelsColors[bookDataIndex],
      labelTextColor:
        bookData.getPieceInfoProperty("customLabelColor") ??
        levelsColors[Math.round(levelsColors.length * 0.4) - 1],
      layoutBookDirectionNormalized: bookData.getPieceInfoProperty("group")
        ? new Vector3(
            groupBookLayoutPosition?.x,
            groupBookLayoutPosition?.y,
            0
          ).normalize()
        : null,
      bookInfo: bookData.pieceInfo,
      singleBooksScales:
        BibleVizDataRepository.getStackPieceMeasurement("BookScales"),
      isCheckpointPlatform: bookData.getPieceInfoProperty("isCheckpoint"),
      // collisionType
    };
    book.OnSpawned({ mod: bookMod });
    bookData.setPiece(book);
    bookData.activate();
    if (BibleVizUtils.Data.masks.isInHistoryMode)
      setTagMask(
        book,
        "color",
        BibleVizUtils.Functions.GetHistoryColor({ piece: book })
      );

    if (
      sectionData.isInExplodedView &&
      bookData.piece?.tags.explodedViewCustomScale
    ) {
      bookData.changeShape(BookShape.ExplodedViewCustomShape);
    }
  }
  if (!sectionData.isInExplodedView && levelScaleZ) {
    bookDesiredPositionZOnRegularView +=
      levelScaleZ + BibleVizDataRepository.getStackSpacing("BetweenBooks");
  }
}
const biblePieces = getBots(
  byTag("isStackPiece", true),
  byTag("isInUse", true)
);
thisBot.TrySetPiecesRenderOrder(biblePieces);
const fixedBooksData = sectionData.getReversedChildren().flat();
for (const bookData of fixedBooksData) {
  const bookDataIndex = fixedBooksData.indexOf(bookData);
  if (!bookData.piece) {
    console.warn("bookData.piece not found at SelectSection");
    continue;
  }
  setTagMask(bookData.piece, "pointable", false);
  if (isInstantaneous)
    bookData.piece.AnimateToDesiredPosition({ isInstantaneous });
  else {
    thirdSequenceAnimations.push(
      os.sleep(timeBetweenBookAnimation * bookDataIndex).then(async () => {
        await bookData.piece
          ?.AnimateToDesiredPosition({ speedMultiplier, isInstantaneous })
          ?.then(() => {
            if (!bookData.piece) {
              console.warn("bookData.piece not found at SelectSection");
              return;
            }
            setTagMask(bookData.piece, "highlightable", true);
            setTagMask(bookData.piece, "pointable", true);
          });
      })
    );
  }
}
if (!isInstantaneous) await Promise.all(thirdSequenceAnimations);

thisBot.TrySetPiecesRenderOrder(biblePieces);

return Promise.all(
  shout("OnStackSectionSelectionAnimationComplete", {
    sectionData,
    speedMultiplier,
    isInstantaneous,
    skipTourGuide,
  })
);

function GetPiecesAboveSection() {
  const pieces: Bot[] = [];
  const sectionDataIndex = testamentData
    ? testamentData.childrenData.indexOf(sectionData as StackSectionData)
    : -1;
  if (bibleData) {
    if (!testamentData) {
      console.warn(
        "SelectSection.GetPiecesAboveSection: testamentData is not defined"
      );
      return pieces;
    }
    for (
      let i = testamentData.getCreationParam("testamentIndex");
      i < bibleData.childrenData.length;
      i++
    ) {
      const currentTestamentData = bibleData.childrenData[i];

      if (!currentTestamentData) {
        console.warn(
          "SelectSection.GetPiecesAboveSection: currentTestamentData not defined"
        );
        return pieces;
      }

      if (currentTestamentData.isSplitIntoSections) {
        for (const currentSectionData of currentTestamentData.childrenData) {
          const currentSectionDataIndex =
            currentTestamentData.childrenData.indexOf(currentSectionData);
          if (
            i < testamentData.getCreationParam("testamentIndex") ||
            (i === testamentData.getCreationParam("testamentIndex") &&
              currentSectionDataIndex <= sectionDataIndex)
          )
            continue;
          if (currentSectionData instanceof StackSectionData) {
            if (currentSectionData.isSplitIntoBooks) {
              for (const bookData of currentSectionData.childrenData.flat()) {
                if (bookData.isActive && bookData.piece) {
                  pieces.push(bookData.piece);
                }
              }
            }
          } else if (currentSectionData.isActive && currentSectionData.piece) {
            pieces.push(currentSectionData.piece);
          }
        }
      } else if (currentTestamentData.isActive && currentTestamentData.piece) {
        if (i <= testamentData.creationParams.testamentIndex) continue;
        pieces.push(currentTestamentData.piece);
      }
    }
  } else if (testamentData) {
    for (const currentSectionData of testamentData.childrenData) {
      const currentSectionDataIndex =
        testamentData.childrenData.indexOf(currentSectionData);
      if (currentSectionDataIndex <= sectionDataIndex) continue;
      if (currentSectionData instanceof StackSectionData) {
        if (currentSectionData.isSplitIntoBooks) {
          for (const bookData of currentSectionData.childrenData.flat()) {
            if (bookData.isActive && bookData.piece) {
              pieces.push(bookData.piece);
            }
          }
        }
      } else if (currentSectionData.isActive && currentSectionData.piece) {
        pieces.push(currentSectionData.piece);
      }
    }
  }
  return pieces;
}
