import type { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";
import type { BibleSequenceAdapterPort } from "bibleStack.application.ports.bibleLifecycle";
import type { BibleSequenceAdapterConfigProviderPort } from "bibleStack.infrastructure.ports.bibleSequence";
import type {
  DimensionProviderPort,
  VisualStateRegistryPort,
} from "bibleStack.infrastructure.ports.bibleSetup";
import type {
  StackCoverMapperPort,
  StackLowerCoverMapperPort,
  StackCrossLineMapperPort,
  StackTestamentMapperPort,
} from "bibleStack.infrastructure.ports.stackPieceLifecycle";
import { BibleType } from "bibleVizUtils.domain.models.canvas";
import { GetBotScales } from "bibleVizUtils.infrastructure.functions.casualos";

interface BibleSequenceAdapterParams {
  configProviderPort: BibleSequenceAdapterConfigProviderPort;
  dimensionProviderPort: DimensionProviderPort;
  visualStateRegistryPort: VisualStateRegistryPort;
  coverMapperPort: StackCoverMapperPort;
  lowerCoverMapperPort: StackLowerCoverMapperPort;
  crossLineMapperPort: StackCrossLineMapperPort;
  testamentMapperPort: StackTestamentMapperPort;
}

export class BibleSequenceAdapter implements BibleSequenceAdapterPort {
  #configProviderPort: BibleSequenceAdapterParams["configProviderPort"];
  #dimensionProviderPort: BibleSequenceAdapterParams["dimensionProviderPort"];
  #visualStateRegistryPort: BibleSequenceAdapterParams["visualStateRegistryPort"];
  #coverMapperPort: BibleSequenceAdapterParams["coverMapperPort"];
  #lowerCoverMapperPort: BibleSequenceAdapterParams["lowerCoverMapperPort"];
  #crossLineMapperPort: BibleSequenceAdapterParams["crossLineMapperPort"];
  #testamentMapperPort: BibleSequenceAdapterParams["testamentMapperPort"];

  constructor({
    configProviderPort,
    dimensionProviderPort,
    visualStateRegistryPort,
    coverMapperPort,
    lowerCoverMapperPort,
    crossLineMapperPort,
    testamentMapperPort,
  }: BibleSequenceAdapterParams) {
    this.#configProviderPort = configProviderPort;
    this.#dimensionProviderPort = dimensionProviderPort;
    this.#visualStateRegistryPort = visualStateRegistryPort;
    this.#coverMapperPort = coverMapperPort;
    this.#lowerCoverMapperPort = lowerCoverMapperPort;
    this.#crossLineMapperPort = crossLineMapperPort;
    this.#testamentMapperPort = testamentMapperPort;
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
      bibleData.bibleType === BibleType.Default ? arePiecesDraggable : false
    );
    setTagMask(
      [crossVerticalLineBot, crossHorizontalLineBot],
      "pointable",
      bibleData.bibleType === BibleType.Default
    );
    setTag(leftCoverBot, dimension, false);
  }
}
