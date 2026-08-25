import type { SpatialNavigationPort } from "../../../application/ports/in/SpatialNavigation";

interface ControllerParams {
  spatialNavigationPort: SpatialNavigationPort;
}

export class CanvasInteractionController {
  #spatialNavigationPort: ControllerParams["spatialNavigationPort"];

  constructor({ spatialNavigationPort }: ControllerParams) {
    this.#spatialNavigationPort = spatialNavigationPort;
  }

  handleOnGridUp() {
    // Fire-and-forget: this responds to a native UI event, so we don't block on it.
    void this.#spatialNavigationPort.handleUserStoppedNavigation();
  }
}
