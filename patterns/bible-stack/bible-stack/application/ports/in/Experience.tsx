export interface ExperienceServicePort {
  clearExperience(): void;
  displayExperience(): Promise<void>;
}
