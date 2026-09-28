import type { PieceHighlightPort } from "../ports/in/PieceHighlight";
import type { PieceKey } from "../../domain/models/piece";
import type { PieceHighlightAdapterPort } from "../ports/out/PieceHighlight";
import type { ExperienceServicePort } from "../ports/in/experience";

interface ServiceParams {
  experienceService: ExperienceServicePort;
  pieceHighlight: PieceHighlightAdapterPort;
}

export class PieceHighlightService implements PieceHighlightPort {
  #pieceHighlight: ServiceParams["pieceHighlight"];
  #experienceService: ServiceParams["experienceService"];

  constructor({ experienceService, pieceHighlight }: ServiceParams) {
    this.#experienceService = experienceService;
    this.#pieceHighlight = pieceHighlight;
  }

  highlight(key: PieceKey) {
    const experience = this.#experienceService.experience;
    if (!experience) return;
    this.#pieceHighlight.highlight(experience, key);
  }

  stopHighlight() {
    this.#pieceHighlight.stopHighlight();
  }
}
