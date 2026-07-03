import type { ViewportPort } from "@packages/Bible Stack/bibleStack/application/ports/in/ViewportPort";
import type { RenderOrderAdapter } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/adapters/casualos/renderOrderAdapter";

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
