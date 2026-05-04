import {
  FocusOnAnimations,
  type FocusOnAnimationKey,
} from "bibleStack.infrastructure.config.sequences.focusOnAnimations";
import {
  CrackOpenBibleAnimationDurations,
  CrackOpenBibleAnimationEasing,
  CrackOpenBibleHighlightConfig,
  type CrackOpenBibleHighlightConfigType,
} from "bibleStack.infrastructure.config.sequences.crackOpenBibleAnimation";
import type { BibleTypeType } from "bibleVizUtils.domain.models.canvas";
import type { SequenceConfigProviderPort } from "bibleStack.infrastructure.ports.sequences";
import type { BibleSequenceServiceConfigProviderPort } from "bibleStack.application.ports.bibleLifecycle";

export class SequenceConfigProvider
  implements SequenceConfigProviderPort, BibleSequenceServiceConfigProviderPort
{
  getFocusOnAnimationConfig(key: FocusOnAnimationKey) {
    return FocusOnAnimations[key];
  }

  getCrackOpenBibleAnimationDuration(bibleType: BibleTypeType) {
    return CrackOpenBibleAnimationDurations[bibleType];
  }

  getCrackOpenBibleAnimationEasing() {
    return CrackOpenBibleAnimationEasing;
  }

  getTestamentHighlightSequenceConfig<
    K extends keyof CrackOpenBibleHighlightConfigType,
  >(key: K): CrackOpenBibleHighlightConfigType[K] {
    return CrackOpenBibleHighlightConfig[key];
  }
}
