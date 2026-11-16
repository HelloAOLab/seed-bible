import type { PieceActivityServicePort } from "../../../application/ports/in/PieceActivity";
import type { RenderOrderAdapter } from "../../adapters/environment/RenderOrderAdapter";
import type { UpperCoverOpacityAdapter } from "../../adapters/stacks/UpperCoverOpacityAdapter";
import type { ViewportServicePort } from "../../../application/ports/in/Viewport";

interface ControllerParams {
  viewportPort: ViewportServicePort;
  renderOrderAdapter: RenderOrderAdapter;
  upperCoverOpacityAdapter: UpperCoverOpacityAdapter;
  pieceActivityService: PieceActivityServicePort;
}

export class CameraController {
  #viewportPort: ControllerParams["viewportPort"];
  #renderOrderAdapter: ControllerParams["renderOrderAdapter"];
  #upperCoverOpacityAdapter: ControllerParams["upperCoverOpacityAdapter"];
  #pieceActivityService: ControllerParams["pieceActivityService"];

  constructor({
    viewportPort,
    renderOrderAdapter,
    upperCoverOpacityAdapter,
    pieceActivityService,
  }: ControllerParams) {
    this.#viewportPort = viewportPort;
    this.#renderOrderAdapter = renderOrderAdapter;
    this.#upperCoverOpacityAdapter = upperCoverOpacityAdapter;
    this.#pieceActivityService = pieceActivityService;
  }

  handleCameraRotationChanged() {
    const visiblePieces = this.#viewportPort.getVisiblePieces();
    this.#renderOrderAdapter.setSortedRenderOrder(visiblePieces);
    this.#upperCoverOpacityAdapter.handleCameraRotationChanged();
    this.#pieceActivityService.updateAllNotificationsDirection();
  }
}
