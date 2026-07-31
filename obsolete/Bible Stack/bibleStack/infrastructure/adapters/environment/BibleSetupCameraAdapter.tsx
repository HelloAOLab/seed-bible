import type { GenericCameraAdapterPort } from "bibleStack.infrastructure.ports.camera";
import type { CameraAdapterPort } from "bibleStack.application.ports.bibleLifecycle";
import type { WorldPosition } from "bibleStack.domain.models.spatial";

interface BibleSetupCameraAdapterParams {
  cameraAdapterPort: GenericCameraAdapterPort;
}

export class BibleSetupCameraAdapter implements CameraAdapterPort {
  #cameraAdapterPort: GenericCameraAdapterPort;

  constructor({ cameraAdapterPort }: BibleSetupCameraAdapterParams) {
    this.#cameraAdapterPort = cameraAdapterPort;
  }

  focusOn(position: WorldPosition) {
    this.#cameraAdapterPort.focusOn(position, "bibleSetup");
  }
}
