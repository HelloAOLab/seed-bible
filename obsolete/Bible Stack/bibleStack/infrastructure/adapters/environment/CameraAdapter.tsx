import type { SequenceConfigProviderPort } from "bibleStack.infrastructure.ports.sequences";
import type { GenericCameraAdapterPort } from "bibleStack.infrastructure.ports.camera";
import type { WorldPosition } from "bibleStack.domain.models.spatial";
import type { FocusOnAnimationKey } from "bibleStack.infrastructure.config.sequences.focusOnAnimations";

interface CameraAdapterParams {
  sequenceConfigProviderPort: SequenceConfigProviderPort;
}

export class CameraAdapter implements GenericCameraAdapterPort {
  #sequenceConfigProviderPort: SequenceConfigProviderPort;

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
