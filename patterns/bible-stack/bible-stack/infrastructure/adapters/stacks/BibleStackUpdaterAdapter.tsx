import type {
  BibleStackUpdaterAdapterPort,
  UpdateCommand,
  UpdateReturnValue,
} from "../../../application/ports/out/BibleStackUpdater";
import type { StackUpdateConfigProvider } from "../../config/stackUpdate/StackUpdateConfigProvider";
import type { StackLowerCoverMapper } from "../../mappers/StackLowerCoverMapper";
import type { StackCoverMapper } from "../../mappers/StackCoverMapper";
import type { StackCrossLineMapper } from "../../mappers/StackCrossLineMapper";
import { GetBotScales } from "../../functions/casualos";
import type { LayoutConfigProvider } from "../../config/layout/LayoutConfigProvider";
import { CrossPositions } from "../../../domain/models/canvas";
import type { LoggerPort } from "../../../application/ports/in/Logger";
import type { TestamentStackUpdaterAdapter } from "./TestamentStackUpdaterAdapter";
import { SetStrictTag, AnimateStrictTag } from "../../functions/casualos";
import type { CrossLineTags } from "../../models/stack";

interface AdapterParams {
  getDimension: () => string;
  stackUpdateConfigProvider: StackUpdateConfigProvider;
  lowerCoverMapper: StackLowerCoverMapper;
  defaultCoverMapper: StackCoverMapper;
  crossLineMapper: StackCrossLineMapper;
  layoutConfigProvider: LayoutConfigProvider;
  loggerPort: LoggerPort;
  testamentStackUpdaterAdapter: TestamentStackUpdaterAdapter;
}

export class BibleStackUpdaterAdapter implements BibleStackUpdaterAdapterPort {
  #getDimension: AdapterParams["getDimension"];
  #stackUpdateConfigProvider: AdapterParams["stackUpdateConfigProvider"];
  #lowerCoverMapper: AdapterParams["lowerCoverMapper"];
  #defaultCoverMapper: AdapterParams["defaultCoverMapper"];
  #crossLineMapper: AdapterParams["crossLineMapper"];
  #stackConfigProvider: AdapterParams["layoutConfigProvider"];
  #loggerPort: AdapterParams["loggerPort"];
  #testamentStackUpdaterAdapter: AdapterParams["testamentStackUpdaterAdapter"];

  constructor({
    getDimension,
    stackUpdateConfigProvider,
    lowerCoverMapper,
    defaultCoverMapper,
    crossLineMapper,
    layoutConfigProvider: stackConfigProvider,
    loggerPort,
    testamentStackUpdaterAdapter,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#stackUpdateConfigProvider = stackUpdateConfigProvider;
    this.#lowerCoverMapper = lowerCoverMapper;
    this.#defaultCoverMapper = defaultCoverMapper;
    this.#crossLineMapper = crossLineMapper;
    this.#stackConfigProvider = stackConfigProvider;
    this.#loggerPort = loggerPort;
    this.#testamentStackUpdaterAdapter = testamentStackUpdaterAdapter;
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
        SetStrictTag(crossVerticalLineBot, "formOpacity", 1);
        SetStrictTag(crossHorizontalLineBot, "formOpacity", 1);
      } else {
        animations.push(
          AnimateStrictTag(
            [crossVerticalLineBot, crossHorizontalLineBot],
            "formOpacity",
            {
              toValue: 0,
              duration: duration / 2,
              easing,
              tagMaskSpace: false,
            }
          ).then(() => {
            SetStrictTag(
              [crossVerticalLineBot, crossHorizontalLineBot],
              (dimension + "Z") as keyof CrossLineTags,
              crossNewPositionZ
            );
            return AnimateStrictTag(
              [crossVerticalLineBot, crossHorizontalLineBot],
              "formOpacity",
              {
                toValue: 1,
                duration: duration / 2,
                easing,
                tagMaskSpace: false,
              }
            );
          })
        );
      }
    } else {
      if (pacing !== "Instant") {
        animations.push(
          AnimateStrictTag(
            [crossVerticalLineBot, crossHorizontalLineBot],
            (dimension + "Z") as keyof CrossLineTags,
            {
              toValue: crossNewPositionZ!,
              duration,
              easing,
              tagMaskSpace: false,
            }
          )
        );
      }
    }

    if (pacing === "Instant") {
      SetStrictTag(
        [crossVerticalLineBot, crossHorizontalLineBot],
        (dimension + "Z") as keyof CrossLineTags,
        crossNewPositionZ!
      );
      SetStrictTag(
        upperCoverBot,
        (dimension + "Z") as keyof typeof upperCoverBot.tags,
        isBibleEmpty ? initialPositionZ : nextPositionZ
      );
    } else {
      animations.push(
        AnimateStrictTag(
          upperCoverBot,
          (dimension + "Z") as keyof typeof upperCoverBot.tags,
          {
            toValue: isBibleEmpty ? initialPositionZ : nextPositionZ,
            duration,
            easing,
            tagMaskSpace: false,
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
