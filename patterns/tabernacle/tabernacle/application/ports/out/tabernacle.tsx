import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";

export interface LayerProviderPort {
  getLayerNumber<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E]
  ): number;
  getLayer<E extends ExperienceKey>(
    experience: E,
    layer: number
  ): ExperienceKeyMap[E][];
  getAllLayers<E extends ExperienceKey>(experience: E): ExperienceKeyMap[E][][];
}
