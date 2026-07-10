import { INITIAL_CONFIG_MAP } from "./InitialConfig";

export class PiecesConfigProvider {
  getInitialConfig<K extends keyof typeof INITIAL_CONFIG_MAP>(
    key: K
  ): (typeof INITIAL_CONFIG_MAP)[K] {
    return INITIAL_CONFIG_MAP[key];
  }
}
