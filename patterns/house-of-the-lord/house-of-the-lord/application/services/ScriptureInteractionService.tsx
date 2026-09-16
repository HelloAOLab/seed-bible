import type { ExperienceKey } from "../../domain/models/experience";
import type { PieceKey } from "../../domain/models/piece";
import type { ExperienceServicePort } from "../ports/in/experience";
import type { PieceFocusPort } from "../ports/in/PieceFocus";
import type { ScriptureInteractionPort } from "../ports/in/scriptureInteraction";

interface ServiceParams {
  pieceFocusPort: PieceFocusPort;
  experienceServicePort: ExperienceServicePort;
}

export class ScriptureInteractionService implements ScriptureInteractionPort {
  #pieceFocusPort: ServiceParams["pieceFocusPort"];
  #experienceServicePort: ServiceParams["experienceServicePort"];
  /** Piece the most recent request is waiting to focus; newest request wins. */
  #targetKey: PieceKey | null = null;

  constructor({ pieceFocusPort, experienceServicePort }: ServiceParams) {
    this.#pieceFocusPort = pieceFocusPort;
    this.#experienceServicePort = experienceServicePort;
  }

  async handlePieceFocusRequest(
    experience: ExperienceKey,
    key: PieceKey
  ): Promise<void> {
    this.#targetKey = key;

    // Settles only once the experience is on stage: right away when it already
    // is and nothing is in flight, and otherwise after the mount or the swap
    // finishes. A request that arrives mid-sequence therefore lands afterwards
    // rather than being dropped or fighting the animation.
    const displayed =
      await this.#experienceServicePort.tryDisplayExperience(experience);
    if (!displayed) return;

    // A later request can have swapped the stage out while this one waited.
    if (this.#experienceServicePort.experience !== experience) return;

    // Another request came in while this one waited, so it owns the focus now.
    if (this.#targetKey !== key) return;

    this.#targetKey = null;
    this.#pieceFocusPort.focus(key);
  }
}
