import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";
import type { LayerProviderPort } from "../../../application/ports/out/tabernacle";
import { LAYERS_MAP } from "./layersMap";

export class LayerConfigProvider implements LayerProviderPort {
  getLayerNumber<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E]
  ): number {
    const index = LAYERS_MAP[experience].findIndex((layer) =>
      layer.includes(key)
    );
    if (index === -1) {
      throw new Error(
        `LayerConfigProvider: key "${key}" not found in any layer for experience "${experience}".`
      );
    }
    return index;
  }

  getLayer<E extends ExperienceKey>(
    experience: E,
    layer: number
  ): ExperienceKeyMap[E][] {
    return LAYERS_MAP[experience][layer] ?? [];
  }

  getAllLayers<E extends ExperienceKey>(
    experience: E
  ): ExperienceKeyMap[E][][] {
    return LAYERS_MAP[experience];
  }
}
