import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";
import type { BibleSequenceAdapterPort } from "bibleStack.application.ports.bibleLifecycle";
import type {
  BibleSequenceAdapterConfigProviderPort,
  PieceMapperPort,
  PieceAdapterPort,
  SectionInfoMapperPort,
} from "bibleStack.infrastructure.ports.bibleSequence";
import type {
  DimensionProviderPort,
  VisualStateRegistryPort,
} from "bibleStack.infrastructure.ports.bibleSetup";
import type {
  StackCoverMapperPort,
  StackLowerCoverMapperPort,
  StackCrossLineMapperPort,
  StackTestamentMapperPort,
  StackSectionMapperPort,
  StackSectionBookMapperPort,
  StackBookMapperPort,
  StackSectionShadowMapperPort,
} from "bibleStack.infrastructure.ports.stackPieceLifecycle";
import { BibleTypes, type Piece } from "bibleVizUtils.domain.models.canvas";
import {
  ApplyStrictMod,
  GetBotScales,
} from "bibleVizUtils.infrastructure.functions.casualos";
import type { StackPresenceNavigationPacing } from "bibleStack.domain.models.userPresence";
import type {
  StackCover,
  StackCrossLine,
} from "bibleStack.domain.models.pieces";
import type {
  BookBot,
  BookTags,
  SectionBot,
  SectionTags,
} from "bibleStack.models.stack";
import { GetDarkerColor } from "bibleVizUtils.domain.functions.colors";

interface BibleSequenceAdapterParams {
  configProviderPort: BibleSequenceAdapterConfigProviderPort;
  dimensionProviderPort: DimensionProviderPort;
  visualStateRegistryPort: VisualStateRegistryPort;
  coverMapperPort: StackCoverMapperPort;
  lowerCoverMapperPort: StackLowerCoverMapperPort;
  crossLineMapperPort: StackCrossLineMapperPort;
  testamentMapperPort: StackTestamentMapperPort;
  sectionMapperPort: StackSectionMapperPort;
  sectionBookMapperPort: StackSectionBookMapperPort;
  bookMapperPort: StackBookMapperPort;
  sectionShadowMapperPort: StackSectionShadowMapperPort;
  pieceMapperPort: PieceMapperPort;
  pieceAdapterPort: PieceAdapterPort;
  sectionInfoMapperPort: SectionInfoMapperPort;
}

export class BibleSequenceAdapter implements BibleSequenceAdapterPort {
  #configProviderPort: BibleSequenceAdapterParams["configProviderPort"];
  #dimensionProviderPort: BibleSequenceAdapterParams["dimensionProviderPort"];
  #visualStateRegistryPort: BibleSequenceAdapterParams["visualStateRegistryPort"];
  #coverMapperPort: BibleSequenceAdapterParams["coverMapperPort"];
  #lowerCoverMapperPort: BibleSequenceAdapterParams["lowerCoverMapperPort"];
  #crossLineMapperPort: BibleSequenceAdapterParams["crossLineMapperPort"];
  #testamentMapperPort: BibleSequenceAdapterParams["testamentMapperPort"];
  #sectionMapperPort: BibleSequenceAdapterParams["sectionMapperPort"];
  #sectionBookMapperPort: BibleSequenceAdapterParams["sectionBookMapperPort"];
  // #bookMapperPort: BibleSequenceAdapterParams["bookMapperPort"];
  // #sectionShadowMapperPort: BibleSequenceAdapterParams["sectionShadowMapperPort"];
  #pieceMapperPort: BibleSequenceAdapterParams["pieceMapperPort"];
  #pieceAdapterPort: BibleSequenceAdapterParams["pieceAdapterPort"];
  #sectionInfoMapperPort: BibleSequenceAdapterParams["sectionInfoMapperPort"];

  constructor({
    configProviderPort,
    dimensionProviderPort,
    visualStateRegistryPort,
    coverMapperPort,
    lowerCoverMapperPort,
    crossLineMapperPort,
    testamentMapperPort,
    sectionMapperPort,
    sectionBookMapperPort,
    // bookMapperPort,
    // sectionShadowMapperPort,
    pieceMapperPort,
    pieceAdapterPort,
    sectionInfoMapperPort,
  }: BibleSequenceAdapterParams) {
    this.#configProviderPort = configProviderPort;
    this.#dimensionProviderPort = dimensionProviderPort;
    this.#visualStateRegistryPort = visualStateRegistryPort;
    this.#coverMapperPort = coverMapperPort;
    this.#lowerCoverMapperPort = lowerCoverMapperPort;
    this.#crossLineMapperPort = crossLineMapperPort;
    this.#testamentMapperPort = testamentMapperPort;
    this.#sectionMapperPort = sectionMapperPort;
    this.#sectionBookMapperPort = sectionBookMapperPort;
    // this.#bookMapperPort = bookMapperPort;
    // this.#sectionShadowMapperPort = sectionShadowMapperPort;
    this.#pieceMapperPort = pieceMapperPort;
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#sectionInfoMapperPort = sectionInfoMapperPort;
  }

  async displayCrackOpenBibleSequence(
    bibleData: StackBibleData,
    arePiecesDraggable: boolean
  ) {
    const dimension = this.#dimensionProviderPort.getCurrentDimension();
    const animationDuration =
      this.#configProviderPort.getCrackOpenBibleAnimationDuration(
        bibleData.bibleType
      );
    const animationEasing =
      this.#configProviderPort.getCrackOpenBibleAnimationEasing();

    const lowerCoverPiece = bibleData.getStaticPiece("lowerCover");
    const upperCoverPiece = bibleData.getStaticPiece("upperCover");
    const leftCoverPiece = bibleData.getStaticPiece("leftCover");
    const crossVerticalLinePiece =
      bibleData.getStaticPiece("crossVerticalLine");
    const crossHorizontalLinePiece = bibleData.getStaticPiece(
      "crossHorizontalLine"
    );

    if (!lowerCoverPiece)
      throw new Error(
        "lowerCover piece not found at displayCrackOpenBibleSequence"
      );
    if (!upperCoverPiece)
      throw new Error(
        "upperCover piece not found at displayCrackOpenBibleSequence"
      );
    if (!leftCoverPiece)
      throw new Error(
        "leftCover piece not found at displayCrackOpenBibleSequence"
      );
    if (!crossVerticalLinePiece)
      throw new Error(
        "crossVerticalLine piece not found at displayCrackOpenBibleSequence"
      );
    if (!crossHorizontalLinePiece)
      throw new Error(
        "crossHorizontalLine piece not found at displayCrackOpenBibleSequence"
      );

    const lowerCoverBot =
      this.#lowerCoverMapperPort.toInfrastructure(lowerCoverPiece);
    if (!lowerCoverBot)
      throw new Error(
        "lowerCover bot not found at displayCrackOpenBibleSequence"
      );

    const upperCoverBot =
      this.#coverMapperPort.toInfrastructure(upperCoverPiece);
    if (!upperCoverBot)
      throw new Error(
        "upperCover bot not found at displayCrackOpenBibleSequence"
      );

    const leftCoverBot = this.#coverMapperPort.toInfrastructure(leftCoverPiece);
    if (!leftCoverBot)
      throw new Error(
        "leftCover bot not found at displayCrackOpenBibleSequence"
      );

    const crossVerticalLineBot = this.#crossLineMapperPort.toInfrastructure(
      crossVerticalLinePiece
    );
    if (!crossVerticalLineBot)
      throw new Error(
        "crossVerticalLine bot not found at displayCrackOpenBibleSequence"
      );

    const crossHorizontalLineBot = this.#crossLineMapperPort.toInfrastructure(
      crossHorizontalLinePiece
    );
    if (!crossHorizontalLineBot)
      throw new Error(
        "crossHorizontalLine bot not found at displayCrackOpenBibleSequence"
      );

    const lowerCoverPosition = getBotPosition(lowerCoverBot, dimension);
    const lowerCoverScales = GetBotScales(lowerCoverBot);
    const testamentsScales: ReturnType<typeof GetBotScales>[] = [];
    const testamentsPositionZ: number[] = [];

    for (
      let testamentIndex = 0;
      testamentIndex < bibleData.childrenData.length;
      testamentIndex++
    ) {
      const testamentData = bibleData.childrenData[testamentIndex];
      if (!testamentData) {
        throw new Error(
          "testamentData not found at displayCrackOpenBibleSequence"
        );
      }
      if (!testamentData.piece) {
        throw new Error(
          "testamentData.piece not found at displayCrackOpenBibleSequence"
        );
      }
      const testamentBot = this.#testamentMapperPort.toInfrastructure(
        testamentData.piece
      );
      if (!testamentBot)
        throw new Error(
          `testament bot not found at displayCrackOpenBibleSequence (index ${testamentIndex})`
        );

      const scales = GetBotScales(testamentBot);
      const positionZ =
        lowerCoverPosition.z +
        lowerCoverScales.z +
        this.#configProviderPort.getStackSpacing("BetweenArrangements") *
          (testamentIndex + 1) +
        scales.z * testamentIndex;
      testamentsScales.push(scales);
      testamentsPositionZ.push(positionZ);
    }

    const lastIndex = bibleData.childrenData.length - 1;
    const lastTestamentScales = testamentsScales[lastIndex];
    const lastTestamentPositionZ = testamentsPositionZ[lastIndex];

    if (!lastTestamentScales)
      throw new Error(
        "lastTestamentScales not found at displayCrackOpenBibleSequence"
      );
    if (lastTestamentPositionZ === undefined)
      throw new Error(
        "lastTestamentPositionZ not found at displayCrackOpenBibleSequence"
      );

    const upperCoverPositionZ =
      lastTestamentPositionZ +
      lastTestamentScales.z +
      this.#configProviderPort.getStackSpacing("BetweenArrangements");
    const upperCoverScales = GetBotScales(upperCoverBot);
    const crossPositionZ =
      upperCoverPositionZ +
      upperCoverScales.z +
      this.#configProviderPort.getStackSpacing("CoverToCross");

    const animations: Promise<unknown>[] = [];

    for (
      let testamentIndex = 0;
      testamentIndex < bibleData.childrenData.length;
      testamentIndex++
    ) {
      const testamentData = bibleData.childrenData[testamentIndex];
      if (!testamentData?.piece) {
        throw new Error(
          "testamentData.piece not found at displayCrackOpenBibleSequence"
        );
      }
      const testamentBot = this.#testamentMapperPort.toInfrastructure(
        testamentData.piece
      );
      if (!testamentBot)
        throw new Error(
          `testament bot not found at displayCrackOpenBibleSequence (index ${testamentIndex})`
        );

      const positionZ = testamentsPositionZ[testamentIndex];
      if (positionZ === undefined)
        throw new Error(
          `positionZ not found at displayCrackOpenBibleSequence (index ${testamentIndex})`
        );

      this.#visualStateRegistryPort.registerStateProperty({
        piece: testamentData.piece,
        property: "desiredPositionZ",
        value: positionZ,
      });
      animations.push(
        animateTag(testamentBot, dimension + "Z", {
          toValue: positionZ,
          duration: animationDuration,
          easing: animationEasing,
        })
      );
    }

    animations.push(
      animateTag(leftCoverBot, "scaleZ", {
        toValue: 0,
        duration: animationDuration,
        easing: animationEasing,
      }),
      animateTag(upperCoverBot, dimension + "Z", {
        toValue: upperCoverPositionZ,
        duration: animationDuration,
        easing: animationEasing,
      }),
      animateTag(
        [crossVerticalLineBot, crossHorizontalLineBot],
        dimension + "Z",
        {
          toValue: crossPositionZ,
          duration: animationDuration,
          easing: animationEasing,
        }
      )
    );

    await Promise.all(animations);

    const testamentBots = bibleData.childrenData.map((testamentData, index) => {
      if (!testamentData.piece)
        throw new Error(
          `testamentData.piece not found at displayCrackOpenBibleSequence (index ${index})`
        );
      const bot = this.#testamentMapperPort.toInfrastructure(
        testamentData.piece
      );
      if (!bot)
        throw new Error(
          `testament bot not found at displayCrackOpenBibleSequence (index ${index})`
        );
      return bot;
    });

    setTagMask(
      testamentBots,
      "draggable",
      bibleData.bibleType === BibleTypes.Default ? arePiecesDraggable : false
    );
    setTagMask(
      [crossVerticalLineBot, crossHorizontalLineBot],
      "pointable",
      bibleData.bibleType === BibleTypes.Default
    );
    setTag(leftCoverBot, dimension, false);
  }

  async displayCloseBibleSequence({
    lowerCover,
    upperCover,
    verticalLine,
    horizontalLine,
    pacing = "Regular",
    piecesToCollapse,
  }: {
    lowerCover: StackCover;
    upperCover: StackCover;
    verticalLine: StackCrossLine;
    horizontalLine: StackCrossLine;
    pacing?: StackPresenceNavigationPacing;
    piecesToCollapse: (
      | Piece<"StackTestament">
      | Piece<"StackSection">
      | Piece<"StackSectionBook">
      | Piece<"StackBook">
      | Piece<"StackSectionShadow">
    )[];
  }) {
    const dimension = this.#dimensionProviderPort.getCurrentDimension();

    const lowerCoverBot =
      this.#lowerCoverMapperPort.toInfrastructure(lowerCover);
    if (!lowerCoverBot) {
      throw new Error(
        `BibleSequenceAdapter: lowerCoverBot not found at displayCloseBibleSequence`
      );
    }
    const lowerCoverPosition = getBotPosition(lowerCoverBot, dimension);
    const lowerCoverScales = GetBotScales(lowerCoverBot);
    const upperCoverClosedPositionZ = lowerCoverPosition.z + lowerCoverScales.z;
    const crossClosedPositionZ = upperCoverClosedPositionZ;
    const desiredElementsScaleZ = 0;
    const botsToCollapse = piecesToCollapse.map((piece) => {
      const bot = this.#pieceMapperPort.toInfrastructure(piece);
      if (!bot) {
        throw new Error(
          `BIbleSequenceAdapter: bot not found at displayCloseBibleSequence`
        );
      }
      return bot;
    });

    const duration =
      this.#configProviderPort.getCloseBibleAnimationDuration(pacing);
    const easing = this.#configProviderPort.getCloseBibleAnimationEasing();
    const upperCoverBot = this.#coverMapperPort.toInfrastructure(upperCover);
    const verticalLineBot =
      this.#crossLineMapperPort.toInfrastructure(verticalLine);
    const horizontalLineBot =
      this.#crossLineMapperPort.toInfrastructure(horizontalLine);

    if (botsToCollapse.length > 0) {
      await Promise.all([
        ...botsToCollapse.map((bot) => {
          const piecePosition = getBotPosition(bot, dimension);
          const pieceScales = GetBotScales(bot);
          return animateTag(bot, {
            fromValue: {
              [dimension + "Z"]: piecePosition.z,
              scaleZ: pieceScales.z,
            },
            toValue: {
              [dimension + "Z"]: upperCoverClosedPositionZ,
              scaleZ: desiredElementsScaleZ,
            },
            duration,
            easing,
          });
        }),
        upperCoverBot
          ? animateTag(upperCoverBot, dimension + "Z", {
              toValue: upperCoverClosedPositionZ,
              duration,
              easing,
            })
          : Promise.resolve(),
        verticalLineBot && horizontalLineBot
          ? animateTag([verticalLineBot, horizontalLineBot], dimension + "Z", {
              toValue: crossClosedPositionZ,
              duration,
              easing,
            })
          : Promise.resolve(),
      ]);

      for (const piece of piecesToCollapse) {
        this.#pieceAdapterPort.hide(piece);
      }
    }

    return;
  }

  async displayOpenBibleSequence({
    lowerCover,
    upperCover,
    verticalLine,
    horizontalLine,
    pacing = "Regular",
    bibleData,
    arePiecesDraggable,
  }: {
    lowerCover: StackCover;
    upperCover: StackCover;
    verticalLine: StackCrossLine;
    horizontalLine: StackCrossLine;
    pacing?: StackPresenceNavigationPacing;
    bibleData: StackBibleData;
    arePiecesDraggable: boolean;
  }) {
    const dimension = this.#dimensionProviderPort.getCurrentDimension();

    const lowerCoverBot =
      this.#lowerCoverMapperPort.toInfrastructure(lowerCover);
    const upperCoverBot = this.#coverMapperPort.toInfrastructure(upperCover);
    const verticalLineBot =
      this.#crossLineMapperPort.toInfrastructure(verticalLine);
    const horizontalLineBot =
      this.#crossLineMapperPort.toInfrastructure(horizontalLine);

    if (!lowerCoverBot) {
      throw new Error(
        `BibleSequenceAdapter: lowerCoverBot not found at displayCloseBibleSequence`
      );
    }
    if (!upperCoverBot) {
      throw new Error(
        `BibleSequenceAdapter: upperCoverBot not found at displayCloseBibleSequence`
      );
    }
    if (!verticalLineBot) {
      throw new Error(
        `BibleSequenceAdapter: verticalLineBot not found at displayCloseBibleSequence`
      );
    }
    if (!horizontalLineBot) {
      throw new Error(
        `BibleSequenceAdapter: horizontalLineBot not found at displayCloseBibleSequence`
      );
    }

    const duration =
      this.#configProviderPort.getOpenBibleAnimationDuration(pacing);
    const easing = this.#configProviderPort.getOpenBibleAnimationEasing();

    const lowerCoverPosition = getBotPosition(lowerCoverBot, dimension);
    const crossVerticalLineScales = GetBotScales(verticalLineBot);
    const sectionInitialScaleZ = 0;

    const initialPositionZ =
      lowerCoverPosition.z +
      this.#configProviderPort.getStackPieceMeasurement("CoverScales").z;
    let nextPositionZ =
      initialPositionZ +
      this.#configProviderPort.getStackSpacing("BetweenArrangements");
    const resizeAnimations = [];

    for (const testamentData of bibleData.childrenData) {
      nextPositionZ +=
        this.#configProviderPort.getStackSpacing("BetweenSections");
      for (const sectionData of testamentData.childrenData) {
        if (!sectionData.piece) {
          throw new Error(
            `BibleSequenceAdapter: sectionData.piece not defined at displayOpenBibleSequence`
          );
        }
        const desiredScaleZ =
          sectionData.getCreationParam("amountOfChaptersInSection") *
          this.#configProviderPort.getStackPieceMeasurement(
            "SectionDesiredScaleZRatio"
          );
        let sectionBot: SectionBot | BookBot | undefined = undefined;

        const baseTags: Partial<SectionTags> & Partial<BookTags> = {
          [dimension]: true,
          [dimension + "X"]: 0,
          [dimension + "Y"]: 0,
          [dimension + "Z"]: initialPositionZ,
          [dimension + "RotationZ"]: 0,
          scaleX:
            this.#configProviderPort.getStackPieceMeasurement("SectionScales")
              .x,
          scaleY:
            this.#configProviderPort.getStackPieceMeasurement("SectionScales")
              .y,
          scaleZ: sectionInitialScaleZ,
          color:
            sectionData.highlightColor ??
            sectionData.getPieceInfoProperty("color"),
          strokeColor: "clear",
          labelOpacity: 0,
          formOpacity: 0.7,
          transformer: bibleData.getStaticPieceId("bibleTransformer"),
          draggable: arePiecesDraggable,
        };
        const baseVisualState = {
          initialScaleX:
            this.#configProviderPort.getStackPieceMeasurement("SectionScales")
              .x,
          initialScaleY:
            this.#configProviderPort.getStackPieceMeasurement("SectionScales")
              .y,
          initialScaleZ: desiredScaleZ,
          hoveredScaleX:
            this.#configProviderPort.getStackPieceMeasurement("SectionScales")
              .x +
            this.#configProviderPort.getStackPieceMeasurement(
              "SectionAditionalScaleOnHover"
            ),
          hoveredScaleY:
            this.#configProviderPort.getStackPieceMeasurement("SectionScales")
              .y +
            this.#configProviderPort.getStackPieceMeasurement(
              "SectionAditionalScaleOnHover"
            ),
          orginalColor: sectionData.getPieceInfoProperty("color"),
          initialColor: sectionData.getPieceInfoProperty("color"),
          labelTextColor: GetDarkerColor(
            sectionData.getPieceInfoProperty("color")
          ),
          desiredPositionZ: nextPositionZ,
          desiredScaleZ,
        };
        switch (sectionData.type) {
          case "StackSection":
            {
              sectionBot = this.#sectionMapperPort.toInfrastructure(
                sectionData.piece
              );
              if (!sectionBot) {
                throw new Error(
                  `BibleSequenceAdapter: sectionBot not found at displayOpenBibleSequence.`
                );
              }
              const sectionMod: Partial<SectionTags> = {
                ...baseTags,
              };
              const infraSectionInfo =
                this.#sectionInfoMapperPort.toInfrastructure(
                  sectionData.pieceInfo
                );
              this.#visualStateRegistryPort.registerState({
                piece: sectionData.piece,
                state: {
                  ...baseVisualState,
                  initialExplodedViewScaleZ:
                    desiredScaleZ *
                    (infraSectionInfo.customExplodedViewScaleFactor ?? 2),
                  desiredExplodedViewScaleZ:
                    desiredScaleZ *
                    (infraSectionInfo.customExplodedViewScaleFactor ?? 2),
                  customColorRange: infraSectionInfo.customColorRange,
                },
              });
              ApplyStrictMod(sectionBot, sectionMod);
            }
            break;
          case "StackSectionBook":
            {
              sectionBot = this.#sectionBookMapperPort.toInfrastructure(
                sectionData.piece
              );
              if (!sectionBot) {
                throw new Error(
                  `BibleSequenceAdapter: sectionBot not found at displayOpenBibleSequence.`
                );
              }
              const sectionMod: Partial<BookTags> = {
                ...baseTags,
              };
              this.#visualStateRegistryPort.registerState({
                piece: sectionData.piece,
                state: {
                  ...baseVisualState,
                },
              });
              ApplyStrictMod(sectionBot, sectionMod);
            }
            break;
        }
        if (sectionBot) {
          setTagMask(sectionBot, "formOpacity", 0.7);
          resizeAnimations.push(
            animateTag(sectionBot, {
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
          if (BibleVizUtils.Data.masks.isInHistoryMode)
            // TODO: Refactor this logic
            setTagMask(
              sectionBot,
              "color",
              BibleVizUtils.Functions.GetHistoryColor({ piece: sectionBot })
            );
        }
        nextPositionZ +=
          desiredScaleZ +
          this.#configProviderPort.getStackSpacing("BetweenSections");
      }
      nextPositionZ += this.#configProviderPort.getStackSpacing(
        "BetweenArrangements"
      );
    }

    const lastTestament =
      bibleData.childrenData[bibleData.childrenData.length - 1];

    if (!lastTestament) {
      throw new Error(
        "BibleSequenceAdapter: lastTestament not found at displayOpenBibleSequence"
      );
    }

    const firstSection = lastTestament.childrenData[0];

    if (!firstSection) {
      throw new Error(
        "BibleSequenceAdapter: firstSection not found at displayOpenBibleSequence"
      );
    }

    const firstSectionPiece = firstSection.piece;

    if (!firstSectionPiece) {
      throw new Error(
        "BibleSequenceAdapter: firstSectionPiece not found at displayOpenBibleSequence"
      );
    }

    const crossOpenedPositionZ =
      this.#visualStateRegistryPort.getStateProperty({
        piece: firstSectionPiece,
        property: "desiredPositionZ",
      }) -
      this.#configProviderPort.getStackSpacing("BetweenArrangements") / 2 -
      this.#configProviderPort.getStackSpacing("BetweenSections") -
      crossVerticalLineScales.z / 2;
    resizeAnimations.push(
      animateTag(upperCoverBot, dimension + "Z", {
        toValue: nextPositionZ,
        duration,
        easing: easing,
      }),
      animateTag([verticalLineBot, horizontalLineBot], dimension + "Z", {
        toValue: crossOpenedPositionZ,
        duration,
        easing: easing,
      })
    );

    await Promise.allSettled(resizeAnimations);
  }
}
