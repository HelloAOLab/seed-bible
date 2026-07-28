export interface ExperienceServicePort {
  clearExperience(): void;
  displayExperience(): Promise<void>;
  closeExperience(): void;
  handleSomeExperienceClosed(id: string): void;
}
