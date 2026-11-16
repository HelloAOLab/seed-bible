import type { ExperienceKey } from "../../../domain/models/experience";

export interface HostNotifierPort {
  notifyReady(): void;
  notifyExperienceChanged(experience: ExperienceKey | null): void;
}
