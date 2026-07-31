import type {
  FocusOnAnimationConfig,
  FocusOnAnimationKey,
} from "bibleStack.infrastructure.config.sequences.focusOnAnimations";

export interface SequenceConfigProviderPort {
  getFocusOnAnimationConfig(key: FocusOnAnimationKey): FocusOnAnimationConfig;
}
