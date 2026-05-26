import type { ExperienceDisplayerPort } from "tabernacle.application.ports.in.experience";

interface ServiceParams {
  experienceDisplayerPort: ExperienceDisplayerPort;
}

export class ScriptureInteractionService {
  #experienceDisplayerPort: ServiceParams["experienceDisplayerPort"];

  constructor({ experienceDisplayerPort }: ServiceParams) {
    this.#experienceDisplayerPort = experienceDisplayerPort;
  }

  async handleVerseMenuClick() {
    const isExperienceDisplayed =
      await this.#experienceDisplayerPort.tryDisplayExperience();
    if (isExperienceDisplayed) {
      // Complete this
    }
  }
}
