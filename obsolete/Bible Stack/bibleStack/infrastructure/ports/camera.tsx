import type { FocusOnAnimationKey } from "bibleStack.infrastructure.config.sequences.focusOnAnimations";
import type { WorldPosition } from "bibleStack.domain.models.spatial";

export interface GenericCameraAdapterPort {
  focusOn(position: WorldPosition, animationKey: FocusOnAnimationKey): void;
}
