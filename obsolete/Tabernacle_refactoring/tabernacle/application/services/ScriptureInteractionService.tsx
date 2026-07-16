import type { ExperienceDisplayerPort } from "tabernacle.application.ports.in.experience";
import type { VerseMenuClickHandlerPort } from "tabernacle.application.ports.in.scriptureInteraction";
import type { PieceKey } from "tabernacle.domain.models.piece";

interface ServiceParams {
  experienceDisplayerPort: ExperienceDisplayerPort;
}

export class ScriptureInteractionService implements VerseMenuClickHandlerPort {
  #experienceDisplayerPort: ServiceParams["experienceDisplayerPort"];

  constructor({ experienceDisplayerPort }: ServiceParams) {
    this.#experienceDisplayerPort = experienceDisplayerPort;
  }

  async handleVerseMenuItemClick(key: PieceKey) {
    const isExperienceDisplayed =
      await this.#experienceDisplayerPort.tryDisplayExperience();
    if (isExperienceDisplayed) {
      console.log(`[Debug] ScriptureInteractionService`, { key });
    }
  }
}
