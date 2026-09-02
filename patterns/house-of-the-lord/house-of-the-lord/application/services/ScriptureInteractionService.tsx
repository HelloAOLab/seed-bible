import type { ExperienceKey } from "../../domain/models/experience";
import type { PieceKey } from "../../domain/models/piece";
import type { PieceFocusPort } from "../ports/in/PieceFocus";
import type { ScriptureInteractionPort } from "../ports/in/scriptureInteraction";

interface ServiceParams {
  pieceFocusPort: PieceFocusPort;
}

export class ScriptureInteractionService implements ScriptureInteractionPort {
  #pieceFocusPort: ServiceParams["pieceFocusPort"];

  constructor({ pieceFocusPort }: ServiceParams) {
    this.#pieceFocusPort = pieceFocusPort;
  }

  handlePieceFocusRequest(key: PieceKey): void {
    this.#pieceFocusPort.focus(key);
  }

  handleExperienceShowRequest(experience: ExperienceKey): void {}
}
