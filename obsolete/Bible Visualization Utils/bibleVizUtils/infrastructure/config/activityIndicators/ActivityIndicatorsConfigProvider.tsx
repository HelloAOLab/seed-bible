import {
  ActivityIndicatorVisualConfigs,
  type ActivityIndicatorVisualConfigsType,
} from "bibleVizUtils.infrastructure.config.activityIndicators.visuals";

export class ActivityIndicatorsConfigProvider {
  getVisualConfig<K extends keyof ActivityIndicatorVisualConfigsType>(
    key: K
  ): ActivityIndicatorVisualConfigsType[K] {
    return ActivityIndicatorVisualConfigs[key];
  }
}
