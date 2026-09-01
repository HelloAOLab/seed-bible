import type { ExperienceServicePort } from "bibleStack.infrastructure.ports.experience";

interface ControllerParams {
  experienceServicePort: ExperienceServicePort;
}

export class ExperienceController {
  #experienceServicePort: ControllerParams["experienceServicePort"];

  constructor({ experienceServicePort }: ControllerParams) {
    this.#experienceServicePort = experienceServicePort;
  }

  handleFloatingAppRemoved(appId: string) {
    this.#experienceServicePort.handleSomeExperienceClosed(appId);
  }
}
