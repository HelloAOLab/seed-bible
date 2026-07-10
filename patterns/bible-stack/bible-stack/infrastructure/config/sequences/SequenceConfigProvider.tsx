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
import {
  CloseBibleAnimationDurations,
  CloseBibleAnimationEasing,
} from "bibleStack.infrastructure.config.sequences.closeBibleAnimation";
import {
  OpenBibleAnimationDurations,
  OpenBibleAnimationEasing,
} from "bibleStack.infrastructure.config.sequences.openBibleAnimation";
import type { BibleType } from "bibleVizUtils.domain.models.canvas";
import type { SequenceConfigProviderPort } from "bibleStack.infrastructure.ports.sequences";
import type { BibleSequenceServiceConfigProviderPort } from "bibleStack.application.ports.bibleLifecycle";

export class SequenceConfigProvider
  implements SequenceConfigProviderPort, BibleSequenceServiceConfigProviderPort
{
  getFocusOnAnimationConfig(key: FocusOnAnimationKey) {
    return FocusOnAnimations[key];
  }

  getCrackOpenBibleAnimationDuration(bibleType: BibleType) {
    return CrackOpenBibleAnimationDurations[bibleType];
  }

  getCrackOpenBibleAnimationEasing() {
    return CrackOpenBibleAnimationEasing;
  }

  getCloseBibleAnimationDuration(
    pacing: keyof typeof CloseBibleAnimationDurations
  ) {
    return CloseBibleAnimationDurations[pacing];
  }

  getCloseBibleAnimationEasing() {
    return CloseBibleAnimationEasing;
  }

  getOpenBibleAnimationDuration(
    pacing: keyof typeof OpenBibleAnimationDurations
  ) {
    return OpenBibleAnimationDurations[pacing];
  }

  getOpenBibleAnimationEasing() {
    return OpenBibleAnimationEasing;
  }

  getTestamentHighlightSequenceConfig<
    K extends keyof CrackOpenBibleHighlightConfigType,
  >(key: K): CrackOpenBibleHighlightConfigType[K] {
    return CrackOpenBibleHighlightConfig[key];
  }
}
