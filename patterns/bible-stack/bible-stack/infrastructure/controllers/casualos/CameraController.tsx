import type { ViewportPort } from "../../../application/ports/in/ViewportPort";
import type { RenderOrderAdapter } from "../../adapters/environment/RenderOrderAdapter";
import type { UpperCoverOpacityAdapter } from "../../adapters/stacks/UpperCoverOpacityAdapter";

interface ControllerParams {
  viewportPort: ViewportPort;
  renderOrderAdapter: RenderOrderAdapter;
  upperCoverOpacityAdapter: UpperCoverOpacityAdapter;
}

export class CameraController {
  #viewportPort: ControllerParams["viewportPort"];
  #renderOrderAdapter: ControllerParams["renderOrderAdapter"];
  #upperCoverOpacityAdapter: ControllerParams["upperCoverOpacityAdapter"];

  constructor({
    viewportPort,
    renderOrderAdapter,
    upperCoverOpacityAdapter,
  }: ControllerParams) {
    this.#viewportPort = viewportPort;
    this.#renderOrderAdapter = renderOrderAdapter;
    this.#upperCoverOpacityAdapter = upperCoverOpacityAdapter;
  }

  handleCameraRotationChanged() {
    const visiblePieces = this.#viewportPort.getVisiblePieces();
    this.#renderOrderAdapter.setSortedRenderOrder(visiblePieces);
    this.#upperCoverOpacityAdapter.handleCameraRotationChanged();
  }
}
