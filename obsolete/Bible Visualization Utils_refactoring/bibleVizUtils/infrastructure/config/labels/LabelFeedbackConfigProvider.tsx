import {
  LabelPosition,
  LabelTranslucencyModes,
  type LabelPositionType,
  type LabelTranslucencyMode,
  type ShowSequencePacing,
} from "bibleVizUtils.domain.models.label";
import {
  ShowAnimationDurationMap,
  ShowAnimationConfig,
  type ShowAnimationDurationMapType,
  type ShowAnimationConfigType,
} from "bibleVizUtils.infrastructure.config.labels.showAnimation";
import type {
  Easing,
  Vector2 as TVector2,
} from "../../../../../../typings/AuxLibraryDefinitions";

const shakeAnimationDelayTimeInMs = 5000;
const shakeDuration = 0.5;
const shakeEasing: Easing = { type: "sinusoidal", mode: "inout" };

const directionMap: Record<LabelPositionType, TVector2> = {
  [LabelPosition.LeftSided]: new Vector2(0.1, 0),
  [LabelPosition.RightSided]: new Vector2(-0.1, 0),
  [LabelPosition.Top]: new Vector2(0, -0.1),
  [LabelPosition.RightSidedCorner]: new Vector2(-0.1, -0.1),
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

  getShakeDirection(position: LabelPositionType): TVector2 {
    return directionMap[position];
  }

  getIntensityOpacity(mode: LabelTranslucencyMode): number {
    return intensityOpacityMap[mode];
  }
}
