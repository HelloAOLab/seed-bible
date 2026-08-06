import type { CameraAdapterPort } from "../../../application/ports/bibleLifecycle";
import type { WorldPosition } from "../../../domain/models/spatial";
import type { CameraAdapter } from "./CameraAdapter";

interface BibleSetupCameraAdapterParams {
  cameraAdapterPort: CameraAdapter;
}

export class BibleSetupCameraAdapter implements CameraAdapterPort {
  #cameraAdapterPort: CameraAdapter;

  constructor({ cameraAdapterPort }: BibleSetupCameraAdapterParams) {
    this.#cameraAdapterPort = cameraAdapterPort;
  }

  focusOn(position: WorldPosition) {
    return this.#cameraAdapterPort.focusOn(position, "bibleSetup");
  }

  cancelFocus() {
    this.#cameraAdapterPort.cancelFocus();
  }
}
