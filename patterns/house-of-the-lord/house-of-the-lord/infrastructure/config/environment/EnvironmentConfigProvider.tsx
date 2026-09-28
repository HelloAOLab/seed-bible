import type { ExperienceKey } from "../../../domain/models/experience";
import { BACKGROUND_MAP } from "./backgroundMap";

export class EnvironmentConfigProvider {
  getBackground<E extends ExperienceKey>(
    experience: E
  ): (typeof BACKGROUND_MAP)[E] {
    return BACKGROUND_MAP[experience];
  }
}
