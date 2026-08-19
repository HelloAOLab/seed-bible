import type { ExperienceKey } from "../../../domain/models/experience";

export interface EnvironmentAdapterPort {
  setUp(experience: ExperienceKey): void;
}
