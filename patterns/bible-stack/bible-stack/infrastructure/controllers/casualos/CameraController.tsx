import type { ViewportPort } from "../../../application/ports/in/ViewportPort";
import type { RenderOrderAdapter } from "../../adapters/environment/RenderOrderAdapter";

interface ControllerParams {
  viewportPort: ViewportPort;
  renderOrderAdapter: RenderOrderAdapter;
}

export class CameraController {
  #viewportPort: ControllerParams["viewportPort"];
  #renderOrderAdapter: ControllerParams["renderOrderAdapter"];

  constructor({ viewportPort, renderOrderAdapter }: ControllerParams) {
    this.#viewportPort = viewportPort;
    this.#renderOrderAdapter = renderOrderAdapter;
  }

  handleCameraRotationChanged() {
    const visiblePieces = this.#viewportPort.getVisiblePieces();
    this.#renderOrderAdapter.setSortedRenderOrder(visiblePieces);
  }
}
