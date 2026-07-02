import type { ExperienceServicePort } from "bibleStack.infrastructure.ports.coverInteraction";

interface ControllerParams {
  experienceServicePort: ExperienceServicePort;
}

export class CoverInteractionController {
  #experienceServicePort: ControllerParams["experienceServicePort"];

  constructor({ experienceServicePort }: ControllerParams) {
    this.#experienceServicePort = experienceServicePort;
  }

  handleCoverClick() {
    this.#experienceServicePort.closeExperience();
  }
}
