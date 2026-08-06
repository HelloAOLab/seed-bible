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

  focusOn(
    position: WorldPosition,
    animationKey: FocusOnAnimationKey,
    overrides?: { duration?: number; zoom?: number }
  ) {
    const config =
      this.#sequenceConfigProviderPort.getFocusOnAnimationConfig(animationKey);
    const easing = { type: config.easingType, mode: config.easingMode };
    const rotation = { x: config.rotationX, y: config.rotationY };
    // A config may fix the focus height (`positionZ`) or defer to the caller's
    // position when the target depth is dynamic (e.g. a growing testament).
    const positionZ = "positionZ" in config ? config.positionZ : position.z;
    const fixedPosition = new Vector3(position.x, position.y, positionZ);
    const desiredFocusOnPosition = GetCamRotationFocusPoint({
      theta: rotation.y,
      phi: rotation.x,
      botPosition: fixedPosition,
    });
    return os.focusOn(
      { x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y },
      {
        duration: overrides?.duration ?? config.duration,
        easing,
        rotation,
        zoom: overrides?.zoom ?? config.zoom,
      }
    );
  }

  cancelFocus() {
    (os.focusOn as unknown as (botOrPosition: null) => Promise<void>)(null);
  }
}
