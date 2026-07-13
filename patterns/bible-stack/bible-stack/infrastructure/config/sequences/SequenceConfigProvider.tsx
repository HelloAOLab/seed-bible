import {
  FocusOnAnimations,
  type FocusOnAnimationKey,
} from "./focusOnAnimations";
import {
  CrackOpenBibleAnimationDurations,
  CrackOpenBibleAnimationEasing,
  CrackOpenBibleHighlightConfig,
  type CrackOpenBibleHighlightConfigType,
} from "./crackOpenBibleAnimation";
import {
  CloseBibleAnimationDurations,
  CloseBibleAnimationEasing,
} from "./closeBibleAnimation";
import {
  OpenBibleAnimationDurations,
  OpenBibleAnimationEasing,
} from "./openBibleAnimation";
import type { BibleType } from "../../../domain/models/canvas";
import type { BibleSequenceServiceConfigProviderPort } from "../../../application/ports/bibleLifecycle";

export class SequenceConfigProvider implements BibleSequenceServiceConfigProviderPort {
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
