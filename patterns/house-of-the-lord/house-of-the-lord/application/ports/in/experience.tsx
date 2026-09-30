import type { ExperienceKey } from "../../../domain/models/experience";

export interface ExperienceServicePort {
  tryDisplayExperience(experience: ExperienceKey): Promise<boolean>;
  experience: ExperienceKey | null;
}
