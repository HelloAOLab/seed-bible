import type { ExperienceServicePort } from "../../../application/ports/in/Experience";

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
