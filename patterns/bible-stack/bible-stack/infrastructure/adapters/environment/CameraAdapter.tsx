import type { WorldPosition } from "../../../domain/models/spatial";
import type { FocusOnAnimationKey } from "../../config/sequences/focusOnAnimations";
import { GetCamRotationFocusPoint } from "../../functions/casualos";
import type { CameraAdapterPort } from "../../../application/ports/bibleLifecycle";
import type { SequenceConfigProvider } from "../../config/sequences/SequenceConfigProvider";

interface CameraAdapterParams {
  sequenceConfigProviderPort: SequenceConfigProvider;
}

export class CameraAdapter implements CameraAdapterPort {
  #sequenceConfigProviderPort: CameraAdapterParams["sequenceConfigProviderPort"];

  constructor({ sequenceConfigProviderPort }: CameraAdapterParams) {
    this.#sequenceConfigProviderPort = sequenceConfigProviderPort;
  }

  focusOn(position: WorldPosition, animationKey: FocusOnAnimationKey) {
    const config =
      this.#sequenceConfigProviderPort.getFocusOnAnimationConfig(animationKey);
    const easing = { type: config.easingType, mode: config.easingMode };
    const rotation = { x: config.rotationX, y: config.rotationY };
    const fixedPosition = new Vector3(position.x, position.y, config.positionZ);
    const desiredFocusOnPosition = GetCamRotationFocusPoint({
      theta: rotation.y,
      phi: rotation.x,
      botPosition: fixedPosition,
    });
    os.focusOn(
      { x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y },
      {
        duration: config.duration,
        easing,
        rotation,
        zoom: config.zoom,
      }
    );
  }
}
