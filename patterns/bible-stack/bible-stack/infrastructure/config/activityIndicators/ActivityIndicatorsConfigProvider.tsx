import {
  type ActivityIndicatorVisualConfig,
  ActivityIndicatorVisualConfigs,
} from "./visuals";

export class ActivityIndicatorsConfigProvider {
  getVisualConfig<K extends keyof ActivityIndicatorVisualConfig>(
    key: K
  ): ActivityIndicatorVisualConfig[K] {
    return ActivityIndicatorVisualConfigs[key];
  }
}
