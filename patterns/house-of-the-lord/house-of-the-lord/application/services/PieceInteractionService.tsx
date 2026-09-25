import {
  PIECE_VISIBILITY_STATES,
  type PieceKey,
} from "../../domain/models/piece";
import type { PieceFocusPort } from "../ports/in/PieceFocus";
import type { LoggerAdapterPort } from "../ports/out/LoggerAdapter";
import type { PieceAdapterPort } from "../ports/out/PieceAdapter";
import type { PiecesProviderAdapterPort } from "../ports/out/PiecesProviderAdapter";
import type { ExperienceServicePort } from "../ports/in/experience";

interface ServiceParams {
  pieceFocusPort: PieceFocusPort;
  piecesProvider: PiecesProviderAdapterPort;
  experienceService: ExperienceServicePort;
  loggerPort: LoggerAdapterPort;
  pieceAdapterPort: PieceAdapterPort;
}

export class PieceInteractionService {
  #pieceFocusPort: ServiceParams["pieceFocusPort"];
  #piecesProvider: ServiceParams["piecesProvider"];
  #experienceService: ServiceParams["experienceService"];
  #loggerPort: ServiceParams["loggerPort"];
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];

  constructor({
    pieceFocusPort,
    piecesProvider,
    experienceService,
    loggerPort,
    pieceAdapterPort,
  }: ServiceParams) {
    this.#pieceFocusPort = pieceFocusPort;
    this.#piecesProvider = piecesProvider;
    this.#experienceService = experienceService;
    this.#loggerPort = loggerPort;
    this.#pieceAdapterPort = pieceAdapterPort;
  }

  handlePieceSelection(key: PieceKey): void {
    const experience = this.#experienceService.experience;
    if (!experience) return;
    const piece = this.#piecesProvider.getPiece(experience, key);
    if (!piece) {
      this.#loggerPort.error(
        "PieceInteractionService: piece not found at handlePieceSelection."
      );
      return;
    }
    const state = this.#pieceAdapterPort.getCurrentState(piece);
    if (state === PIECE_VISIBILITY_STATES.SHOWN) {
      this.#pieceFocusPort.focus(key);
    }
  }
}
