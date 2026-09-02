import type { ScriptureInteractionPort } from "../../../application/ports/in/scriptureInteraction";
import type { ExperienceKey } from "../../../domain/models/experience";
import type { PieceKey } from "../../../domain/models/piece";

interface ControllerParams {
  scriptureInteractionPort: ScriptureInteractionPort;
}

export class ScriptureInteractionController {
  #scriptureInteractionPort: ControllerParams["scriptureInteractionPort"];

  constructor({ scriptureInteractionPort }: ControllerParams) {
    this.#scriptureInteractionPort = scriptureInteractionPort;
  }

  handlePieceFocusRequest(key: PieceKey) {
    this.#scriptureInteractionPort.handlePieceFocusRequest(key);
  }

  handleExperienceShowRequest(experience: ExperienceKey) {
    this.#scriptureInteractionPort.handleExperienceShowRequest(experience);
  }
}
