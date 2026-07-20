import { INITIAL_CONFIG_MAP } from "./InitialConfig";
import { INITIAL_VISUAL_STATE_MAP } from "./InitialVisualState";

export class PiecesConfigProvider {
  getInitialConfig<K extends keyof typeof INITIAL_CONFIG_MAP>(
    key: K
  ): (typeof INITIAL_CONFIG_MAP)[K] {
    return INITIAL_CONFIG_MAP[key];
  }
  getInitialVisualState<K extends keyof typeof INITIAL_VISUAL_STATE_MAP>(
    key: K
  ): (typeof INITIAL_VISUAL_STATE_MAP)[K] {
    return INITIAL_VISUAL_STATE_MAP[key];
  }
}
