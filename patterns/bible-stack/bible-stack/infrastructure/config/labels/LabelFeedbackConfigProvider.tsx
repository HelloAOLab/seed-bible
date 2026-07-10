import {
  LabelPositions,
  LabelTranslucencyModes,
  type LabelPosition,
  type LabelTranslucencyMode,
  type ShowSequencePacing,
} from "../../../domain/models/label";
import {
  ShowAnimationDurationMap,
  ShowAnimationConfig,
  type ShowAnimationDurationMapType,
  type ShowAnimationConfigType,
} from "./showAnimation";
import type {
  Easing,
  Vector2 as TVector2,
} from "../../../../../pattern-typings/AuxLibraryDefinitions";

const shakeAnimationDelayTimeInMs = 5000;
const shakeDuration = 0.5;
const shakeEasing: Easing = { type: "sinusoidal", mode: "inout" };

const directionMap: Record<LabelPosition, TVector2> = {
  [LabelPositions.LeftSided]: new Vector2(0.1, 0),
  [LabelPositions.RightSided]: new Vector2(-0.1, 0),
  [LabelPositions.Top]: new Vector2(0, -0.1),
  [LabelPositions.RightSidedCorner]: new Vector2(-0.1, -0.1),
};

const intensityOpacityMap: Record<LabelTranslucencyMode, number> = {
  [LabelTranslucencyModes.Solid]: 1,
  [LabelTranslucencyModes.Faded]: 0.75,
};

export class LabelFeedbackConfigProvider {
  getShowAnimationDuration<P extends ShowSequencePacing>(
    pacing: P
  ): ShowAnimationDurationMapType[P] {
    return ShowAnimationDurationMap[pacing];
  }

  getShowAnimationConfig<K extends keyof ShowAnimationConfigType>(
    key: K
  ): ShowAnimationConfigType[K] {
    return ShowAnimationConfig[key];
  }

  getShakeAnimationDelay(): number {
    return shakeAnimationDelayTimeInMs;
  }

  getShakeDuration(): number {
    return shakeDuration;
  }

  getShakeEasing(): Easing {
    return shakeEasing;
  }

  getShakeDirection(position: LabelPosition): TVector2 {
    return directionMap[position];
  }

  getIntensityOpacity(mode: LabelTranslucencyMode): number {
    return intensityOpacityMap[mode];
  }
}
