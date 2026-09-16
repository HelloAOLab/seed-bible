import type { ExperienceKey } from "../../../domain/models/experience";

export interface EnvironmentSetUpPort {
  setUp(experience: ExperienceKey): void;
}
