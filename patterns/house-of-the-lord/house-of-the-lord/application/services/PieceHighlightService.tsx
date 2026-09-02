import type { PieceHighlightPort } from "../ports/in/PieceHighlight";
import type { ExperienceKey } from "../../domain/models/experience";
import type { PieceKey } from "../../domain/models/piece";
import type { PieceHighlightAdapterPort } from "../ports/out/PieceHighlight";

interface ServiceParams {
  getExperienceKey: () => ExperienceKey;
  pieceHighlight: PieceHighlightAdapterPort;
}

export class PieceHighlightService implements PieceHighlightPort {
  #pieceHighlight: ServiceParams["pieceHighlight"];
  #getExperienceKey: ServiceParams["getExperienceKey"];

  constructor({ getExperienceKey, pieceHighlight }: ServiceParams) {
    this.#getExperienceKey = getExperienceKey;
    this.#pieceHighlight = pieceHighlight;
  }

  highlight(key: PieceKey) {
    const experience = this.#getExperienceKey();
    this.#pieceHighlight.highlight(experience, key);
  }

  stopHighlight() {
    this.#pieceHighlight.stopHighlight();
  }
}
