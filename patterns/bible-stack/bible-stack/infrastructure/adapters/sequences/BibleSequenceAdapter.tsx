import type { StackBibleData } from "../../../domain/entities/StackBibleData";
import type { BibleSequenceAdapterPort } from "../../../application/ports/bibleLifecycle";
// import type {
//   BibleSequenceAdapterConfigProviderPort,
//   PieceMapperPort,
//   PieceAdapterPort,
//   SectionInfoMapperPort,
// } from "bibleStack.infrastructure.ports.bibleSequence";
// import type {
//   DimensionProviderPort,
//   VisualStateRegistryPort,
// } from "bibleStack.infrastructure.ports.bibleSetup";
import type { StackCoverMapper } from "../../mappers/StackCoverMapper";
import type { StackLowerCoverMapper } from "../../mappers/StackLowerCoverMapper";
import type { StackCrossLineMapper } from "../../mappers/StackCrossLineMapper";
import type { StackTestamentMapper } from "../../mappers/StackTestamentMapper";
import type { StackSectionMapper } from "../../mappers/StackSectionMapper";
import type { StackSectionBookMapper } from "../../mappers/StackSectionBookMapper";
import type { StackBookMapper } from "../../mappers/StackBookMapper";
import type { StackSectionShadowMapper } from "../../mappers/StackSectionShadowMapper";
import { BibleTypes, type Piece } from "../../../domain/models/canvas";
import {
  AnimateStrictTag,
  ApplyStrictMod,
  GetBotScales,
  SetStrictTag,
} from "../../functions/casualos";
import type { StackPresenceNavigationPacing } from "../../../domain/models/userPresence";
import type { StackCover, StackCrossLine } from "../../../domain/models/pieces";
import type {
  BookBot,
  BookTags,
  SectionBot,
  SectionTags,
} from "../../models/stack";
import { GetDarkerColor } from "../../../domain/functions/colors";
import type { SequenceConfigProvider } from "../../config/sequences/SequenceConfigProvider";
import type { VisualStateRegistry } from "../stacks/VisualStateRegistry";
import type { PieceMapper } from "../../mappers/PieceMapper";
import type { PieceAdapter } from "../stacks/PieceAdapter";
import type { SectionInfoMapper } from "../../mappers/SectionInfoMapper";
import type { LayoutConfigProvider } from "../../config/layout/LayoutConfigProvider";
import type { PiecesConfigProvider } from "../../config/pieces/PiecesConfigProvider";
import type { PieceBotTags } from "../../models/casualos";

interface BibleSequenceAdapterParams {
  configProviderPort: SequenceConfigProvider;
  dimensionProviderPort: {
    getDimension: () => string;
  };
  visualStateRegistryPort: VisualStateRegistry;
  coverMapperPort: StackCoverMapper;
  lowerCoverMapperPort: StackLowerCoverMapper;
  crossLineMapperPort: StackCrossLineMapper;
  testamentMapperPort: StackTestamentMapper;
  sectionMapperPort: StackSectionMapper;
  sectionBookMapperPort: StackSectionBookMapper;
  bookMapperPort: StackBookMapper;
  sectionShadowMapperPort: StackSectionShadowMapper;
  pieceMapperPort: PieceMapper;
  pieceAdapterPort: PieceAdapter;
  sectionInfoMapperPort: SectionInfoMapper;
  layoutConfigProviderPort: LayoutConfigProvider;
  piecesConigProvider: PiecesConfigProvider;
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
  #pieceMapperPort: BibleSequenceAdapterParams["pieceMapperPort"];
  #pieceAdapterPort: BibleSequenceAdapterParams["pieceAdapterPort"];
  #sectionInfoMapperPort: BibleSequenceAdapterParams["sectionInfoMapperPort"];
  #layoutConfigProviderPort: BibleSequenceAdapterParams["layoutConfigProviderPort"];
  #piecesConigProvider: BibleSequenceAdapterParams["piecesConigProvider"];

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
    pieceMapperPort,
    pieceAdapterPort,
    sectionInfoMapperPort,
    layoutConfigProviderPort,
    piecesConigProvider,
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
    this.#pieceMapperPort = pieceMapperPort;
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#sectionInfoMapperPort = sectionInfoMapperPort;
    this.#layoutConfigProviderPort = layoutConfigProviderPort;
    this.#piecesConigProvider = piecesConigProvider;
  }

  async displayCrackOpenBibleSequence(
    bibleData: StackBibleData,
    arePiecesDraggable: boolean
  ) {
    const dimension = this.#dimensionProviderPort.getDimension();
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
        this.#layoutConfigProviderPort.getStackSpacing("BetweenArrangements") *
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
      this.#layoutConfigProviderPort.getStackSpacing("BetweenArrangements");
    const upperCoverScales = GetBotScales(upperCoverBot);
    const crossPositionZ =
      upperCoverPositionZ +
      upperCoverScales.z +
      this.#layoutConfigProviderPort.getStackSpacing("CoverToCross");

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
        AnimateStrictTag(
          testamentBot,
          (dimension + "Z") as keyof PieceBotTags,
          {
            toValue: positionZ,
            duration: animationDuration,
            easing: animationEasing,
            tagMaskSpace: false,
          }
        )
      );
    }

    animations.push(
      AnimateStrictTag(leftCoverBot, "scaleZ", {
        toValue: 0,
        duration: animationDuration,
        easing: animationEasing,
        tagMaskSpace: false,
      }),
      AnimateStrictTag(upperCoverBot, (dimension + "Z") as keyof PieceBotTags, {
        toValue: upperCoverPositionZ,
        duration: animationDuration,
        easing: animationEasing,
        tagMaskSpace: false,
      }),
      AnimateStrictTag(
        [crossVerticalLineBot, crossHorizontalLineBot],
        (dimension + "Z") as keyof PieceBotTags,
        {
          toValue: crossPositionZ,
          duration: animationDuration,
          easing: animationEasing,
          tagMaskSpace: false,
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

    SetStrictTag(
      testamentBots,
      "draggable",
      bibleData.bibleType === BibleTypes.Default ? arePiecesDraggable : false
    );
    SetStrictTag(
      [crossVerticalLineBot, crossHorizontalLineBot],
      "pointable",
      bibleData.bibleType === BibleTypes.Default
    );
    SetStrictTag(leftCoverBot, dimension as keyof PieceBotTags, false);
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
    const dimension = this.#dimensionProviderPort.getDimension();

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
          return AnimateStrictTag(bot, {
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
            tagMaskSpace: false,
          });
        }),
        upperCoverBot
          ? AnimateStrictTag(
              upperCoverBot,
              (dimension + "Z") as keyof PieceBotTags,
              {
                toValue: upperCoverClosedPositionZ,
                duration,
                easing,
                tagMaskSpace: false,
              }
            )
          : Promise.resolve(),
        verticalLineBot && horizontalLineBot
          ? AnimateStrictTag(
              [verticalLineBot, horizontalLineBot],
              (dimension + "Z") as keyof PieceBotTags,
              {
                toValue: crossClosedPositionZ,
                duration,
                easing,
                tagMaskSpace: false,
              }
            )
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
    const dimension = this.#dimensionProviderPort.getDimension();

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
      this.#layoutConfigProviderPort.getStackPieceMeasurement("CoverScales").z;
    let nextPositionZ =
      initialPositionZ +
      this.#layoutConfigProviderPort.getStackSpacing("BetweenArrangements");
    const resizeAnimations = [];

    for (const testamentData of bibleData.childrenData) {
      nextPositionZ +=
        this.#layoutConfigProviderPort.getStackSpacing("BetweenSections");
      for (const sectionData of testamentData.childrenData) {
        if (!sectionData.piece) {
          throw new Error(
            `BibleSequenceAdapter: sectionData.piece not defined at displayOpenBibleSequence`
          );
        }
        const desiredScaleZ =
          sectionData.getCreationParam("amountOfChaptersInSection") *
          this.#layoutConfigProviderPort.getStackPieceMeasurement(
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
            this.#layoutConfigProviderPort.getStackPieceMeasurement(
              "SectionScales"
            ).x,
          scaleY:
            this.#layoutConfigProviderPort.getStackPieceMeasurement(
              "SectionScales"
            ).y,
          scaleZ: sectionInitialScaleZ,
          color:
            sectionData.paintColor ?? sectionData.getPieceInfoProperty("color"),
          strokeColor: "clear",
          labelOpacity: 0,
          formOpacity: 0.7,
          transformer: bibleData.getStaticPieceId("bibleTransformer"),
          draggable: arePiecesDraggable,
        };
        const baseVisualState = {
          initialScaleX:
            this.#layoutConfigProviderPort.getStackPieceMeasurement(
              "SectionScales"
            ).x,
          initialScaleY:
            this.#layoutConfigProviderPort.getStackPieceMeasurement(
              "SectionScales"
            ).y,
          initialScaleZ: desiredScaleZ,
          hoveredScaleX:
            this.#layoutConfigProviderPort.getStackPieceMeasurement(
              "SectionScales"
            ).x +
            this.#layoutConfigProviderPort.getStackPieceMeasurement(
              "SectionAditionalScaleOnHover"
            ),
          hoveredScaleY:
            this.#layoutConfigProviderPort.getStackPieceMeasurement(
              "SectionScales"
            ).y +
            this.#layoutConfigProviderPort.getStackPieceMeasurement(
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
              const initialVisualState =
                this.#piecesConigProvider.getInitialVisualState(
                  sectionData.type
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
                  hoveredFormOpacity:
                    initialVisualState.hoveredFormOpacity ?? 1,
                  unhoveredFormOpacity:
                    initialVisualState.unhoveredFormOpacity ?? 1,
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
              const sectionScales =
                this.#layoutConfigProviderPort.getStackPieceMeasurement(
                  "SectionScales"
                );
              const additionalScaleOnHover =
                this.#layoutConfigProviderPort.getStackPieceMeasurement(
                  "SectionAditionalScaleOnHover"
                );
              const bookScales =
                this.#layoutConfigProviderPort.getStackPieceMeasurement(
                  "BookScales"
                );
              const initialVisualState =
                this.#piecesConigProvider.getInitialVisualState(
                  sectionData.type
                );
              this.#visualStateRegistryPort.registerState({
                piece: sectionData.piece,
                state: {
                  orginalColor: sectionData.getPieceInfoProperty("color"),
                  initialColor: sectionData.getPieceInfoProperty("color"),
                  labelTextColor: GetDarkerColor(
                    sectionData.getPieceInfoProperty("color")
                  ),
                  desiredScaleZ,
                  desiredPositionZ: nextPositionZ,
                  hoveredFormOpacity:
                    initialVisualState.hoveredFormOpacity ?? 1,
                  unhoveredFormOpacity:
                    initialVisualState.unhoveredFormOpacity ?? 1,
                  chapterColumns: 0,
                  chapterRows: 0,
                  singleBooksScales: { x: bookScales.x, y: bookScales.y },
                  unhoveredScales: {
                    x: sectionScales.x,
                    y: sectionScales.y,
                    z: desiredScaleZ,
                  },
                  hoveredScales: {
                    x: sectionScales.x + additionalScaleOnHover,
                    y: sectionScales.y + additionalScaleOnHover,
                    z: desiredScaleZ,
                  },
                },
              });
              ApplyStrictMod(sectionBot, sectionMod);
            }
            break;
        }
        if (sectionBot) {
          SetStrictTag(sectionBot, "formOpacity", 0.7);
          resizeAnimations.push(
            AnimateStrictTag(sectionBot, {
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
              tagMaskSpace: false,
            })
          );
        }
        nextPositionZ +=
          desiredScaleZ +
          this.#layoutConfigProviderPort.getStackSpacing("BetweenSections");
      }
      nextPositionZ += this.#layoutConfigProviderPort.getStackSpacing(
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
      this.#layoutConfigProviderPort.getStackSpacing("BetweenArrangements") /
        2 -
      this.#layoutConfigProviderPort.getStackSpacing("BetweenSections") -
      crossVerticalLineScales.z / 2;
    resizeAnimations.push(
      AnimateStrictTag(upperCoverBot, (dimension + "Z") as keyof PieceBotTags, {
        toValue: nextPositionZ,
        duration,
        easing: easing,
        tagMaskSpace: false,
      }),
      AnimateStrictTag(
        [verticalLineBot, horizontalLineBot],
        (dimension + "Z") as keyof PieceBotTags,
        {
          toValue: crossOpenedPositionZ,
          duration,
          easing: easing,
          tagMaskSpace: false,
        }
      )
    );

    await Promise.allSettled(resizeAnimations);
  }
}
