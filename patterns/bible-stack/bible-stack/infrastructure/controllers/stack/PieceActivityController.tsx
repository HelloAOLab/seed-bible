import type { PieceActivityService } from "../../../application/services/PieceActivityService";

interface ControllerParams {
  pieceActivityService: PieceActivityService;
}

export class PieceActivityController {
  #pieceActivityService: ControllerParams["pieceActivityService"];

  constructor({ pieceActivityService }: ControllerParams) {
    this.#pieceActivityService = pieceActivityService;
  }

  handleIdentityChanged() {
    this.#updateActivity();
  }

  #updateActivity() {
    this.#pieceActivityService.updateAllIndicators();
    this.#pieceActivityService.updateAllNotifications();
  }
}
