import type { ExperienceKey } from "../../domain/models/experience";
import {
  PIECE_VISIBILITY_STATES,
  type PieceKey,
} from "../../domain/models/piece";
import type { PieceFocusPort } from "../ports/in/PieceFocus";
import type { LoggerAdapterPort } from "../ports/out/LoggerAdapter";
import type { PieceAdapterPort } from "../ports/out/PieceAdapter";
import type { PiecesProviderAdapterPort } from "../ports/out/PiecesProviderAdapter";

interface ServiceParams {
  pieceFocusPort: PieceFocusPort;
  piecesProvider: PiecesProviderAdapterPort;
  getExperience: () => ExperienceKey;
  loggerPort: LoggerAdapterPort;
  pieceAdapterPort: PieceAdapterPort;
}

export class PieceInteractionService {
  #pieceFocusPort: ServiceParams["pieceFocusPort"];
  #piecesProvider: ServiceParams["piecesProvider"];
  #getExperience: ServiceParams["getExperience"];
  #loggerPort: ServiceParams["loggerPort"];
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];

  constructor({
    pieceFocusPort,
    piecesProvider,
    getExperience,
    loggerPort,
    pieceAdapterPort,
  }: ServiceParams) {
    this.#pieceFocusPort = pieceFocusPort;
    this.#piecesProvider = piecesProvider;
    this.#getExperience = getExperience;
    this.#loggerPort = loggerPort;
    this.#pieceAdapterPort = pieceAdapterPort;
  }

  handlePieceSelection(key: PieceKey): void {
    const experience = this.#getExperience();
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
