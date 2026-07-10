import type {
  BibleStackUpdaterAdapterPort,
  UpdateCommand,
  UpdateReturnValue,
} from "@packages/Bible Stack/bibleStack/application/ports/out/BibleStackUpdater";
import type { StackUpdateConfigProvider } from "../../config/stackUpdate/StackUpdateConfigProvider";
import type { StackLowerCoverMapper } from "../../mappers/StackLowerCoverMapper";
import type { StackCoverMapper } from "../../mappers/StackCoverMapper";
import type { StackCrossLineMapper } from "../../mappers/StackCrossLineMapper";
import { GetBotScales } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/functions/casualos";
import type { StackConfigProvider } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/config/stacks/StackConfigProvider";
import { CrossPositions } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import type { LoggerPort } from "@packages/Bible Stack/bibleStack/application/ports/in/Logger";
import type { TestamentStackUpdaterAdapter } from "./TestamentStackUpdaterAdapter";
import type {
  SetStrictTag,
  AnimateStrictTag,
} from "bibleVizUtils.infrastructure.functions.casualos";
import type { CrossLineTags } from "@packages/Bible Stack/bibleStack/models/stack";

interface AdapterParams {
  getDimension: () => string;
  stackUpdateConfigProvider: StackUpdateConfigProvider;
  lowerCoverMapper: StackLowerCoverMapper;
  defaultCoverMapper: StackCoverMapper;
  crossLineMapper: StackCrossLineMapper;
  stackConfigProvider: StackConfigProvider;
  loggerPort: LoggerPort;
  testamentStackUpdaterAdapter: TestamentStackUpdaterAdapter;
  setStrictTag: typeof SetStrictTag;
  animateStrictTag: typeof AnimateStrictTag;
}

export class BibleStackUpdaterAdapter implements BibleStackUpdaterAdapterPort {
  #getDimension: AdapterParams["getDimension"];
  #stackUpdateConfigProvider: AdapterParams["stackUpdateConfigProvider"];
  #lowerCoverMapper: AdapterParams["lowerCoverMapper"];
  #defaultCoverMapper: AdapterParams["defaultCoverMapper"];
  #crossLineMapper: AdapterParams["crossLineMapper"];
  #stackConfigProvider: AdapterParams["stackConfigProvider"];
  #loggerPort: AdapterParams["loggerPort"];
  #testamentStackUpdaterAdapter: AdapterParams["testamentStackUpdaterAdapter"];
  #setStrictTag: AdapterParams["setStrictTag"];
  #animateStrictTag: AdapterParams["animateStrictTag"];

  constructor({
    getDimension,
    stackUpdateConfigProvider,
    lowerCoverMapper,
    defaultCoverMapper,
    crossLineMapper,
    stackConfigProvider,
    loggerPort,
    testamentStackUpdaterAdapter,
    setStrictTag,
    animateStrictTag,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#stackUpdateConfigProvider = stackUpdateConfigProvider;
    this.#lowerCoverMapper = lowerCoverMapper;
    this.#defaultCoverMapper = defaultCoverMapper;
    this.#crossLineMapper = crossLineMapper;
    this.#stackConfigProvider = stackConfigProvider;
    this.#loggerPort = loggerPort;
    this.#testamentStackUpdaterAdapter = testamentStackUpdaterAdapter;
    this.#setStrictTag = setStrictTag;
    this.#animateStrictTag = animateStrictTag;
  }

  async update({
    pacing,
    lowerCover,
    upperCover,
    crossHorizontalLine,
    crossVerticalLine,
    isBibleEmpty,
    shouldCrossGoInMiddle,
    activeTestaments,
    currentCrossPosition,
  }: UpdateCommand): UpdateReturnValue {
    const dimension = this.#getDimension();
    const duration = this.#stackUpdateConfigProvider.getDuration(pacing);
    const easing = this.#stackUpdateConfigProvider.getEasing();

    const lowerCoverBot = this.#lowerCoverMapper.toInfrastructure(lowerCover);
    const upperCoverBot = this.#defaultCoverMapper.toInfrastructure(upperCover);
    const crossHorizontalLineBot =
      this.#crossLineMapper.toInfrastructure(crossHorizontalLine);
    const crossVerticalLineBot =
      this.#crossLineMapper.toInfrastructure(crossVerticalLine);

    if (
      !lowerCoverBot ||
      !upperCoverBot ||
      !crossHorizontalLineBot ||
      !crossVerticalLineBot
    ) {
      this.#loggerPort.error(
        `BibleStackUpdaterAdapter: Static pieces bot not found`,
        {
          lowerCoverBot,
          upperCoverBot,
          crossHorizontalLineBot,
          crossVerticalLineBot,
        }
      );
      return {
        targetCrossPosition: currentCrossPosition,
      };
    }

    const lowerCoverPosition = getBotPosition(lowerCoverBot, dimension);
    const lowerCoverScales = GetBotScales(lowerCoverBot);
    const upperCoverScales = GetBotScales(upperCoverBot);
    const animations: Promise<void>[] = [];
    let crossNewPositionZ: number;
    const initialPositionZ = lowerCoverPosition.z + lowerCoverScales.z;
    let nextPositionZ = initialPositionZ;
    const spaceBetweenArrangement = this.#stackConfigProvider.getStackSpacing(
      "BetweenArrangements"
    );

    if (!isBibleEmpty) {
      nextPositionZ += spaceBetweenArrangement;
      for (const testamentData of activeTestaments) {
        const { computedAnimations, deltaPositionZ } =
          this.#testamentStackUpdaterAdapter.computeVisualUpdate({
            pacing,
            data: testamentData,
            desiredPositionZ: nextPositionZ,
            dimension,
            duration,
            easing,
          });
        animations.push(...computedAnimations);
        nextPositionZ += deltaPositionZ;
        if (
          shouldCrossGoInMiddle &&
          activeTestaments.indexOf(testamentData) === 0
        ) {
          crossNewPositionZ = nextPositionZ + spaceBetweenArrangement / 2;
        }
        nextPositionZ += spaceBetweenArrangement;
      }
    }

    if (!shouldCrossGoInMiddle) {
      crossNewPositionZ = isBibleEmpty
        ? initialPositionZ + upperCoverScales.z
        : nextPositionZ +
          this.#stackConfigProvider.getStackSpacing("CoverToCross");
    }

    const targetCrossPosition = shouldCrossGoInMiddle
      ? CrossPositions.Middle
      : CrossPositions.Top;

    if (currentCrossPosition !== targetCrossPosition) {
      if (pacing === "Instant") {
        this.#setStrictTag(crossVerticalLineBot, "formOpacity", 1);
        this.#setStrictTag(crossHorizontalLineBot, "formOpacity", 1);
      } else {
        animations.push(
          this.#animateStrictTag(
            [crossVerticalLineBot, crossHorizontalLineBot],
            "formOpacity",
            {
              toValue: 0,
              duration: duration / 2,
              easing,
            }
          ).then(() => {
            this.#setStrictTag(
              [crossVerticalLineBot, crossHorizontalLineBot],
              (dimension + "Z") as keyof CrossLineTags,
              crossNewPositionZ
            );
            return this.#animateStrictTag(
              [crossVerticalLineBot, crossHorizontalLineBot],
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
      if (pacing !== "Instant") {
        animations.push(
          this.#animateStrictTag(
            [crossVerticalLineBot, crossHorizontalLineBot],
            (dimension + "Z") as keyof CrossLineTags,
            {
              toValue: crossNewPositionZ!,
              duration,
              easing,
            }
          )
        );
      }
    }

    if (pacing === "Instant") {
      this.#setStrictTag(
        [crossVerticalLineBot, crossHorizontalLineBot],
        (dimension + "Z") as keyof CrossLineTags,
        crossNewPositionZ!
      );
      this.#setStrictTag(
        upperCoverBot,
        (dimension + "Z") as keyof typeof upperCoverBot.tags,
        isBibleEmpty ? initialPositionZ : nextPositionZ
      );
    } else {
      animations.push(
        this.#animateStrictTag(
          upperCoverBot,
          (dimension + "Z") as keyof typeof upperCoverBot.tags,
          {
            toValue: isBibleEmpty ? initialPositionZ : nextPositionZ,
            duration,
            easing,
          }
        )
      );
    }

    await Promise.all(animations);

    return {
      targetCrossPosition,
    };
  }
}
