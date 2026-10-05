import { FocusOnAnimations } from "./focusOnAnimations";
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
import {
  ToggleBibleAnimationConfigs,
  type ToggleBibleAnimationConfigType,
} from "./toggleBibleModeAnimation";
import type { FocusOnAnimationKey } from "../../../application/ports/out/Camera";
import type { SequenceConfigProviderPort } from "../../../application/ports/out/SequenceConfigProvider";

export class SequenceConfigProvider implements SequenceConfigProviderPort {
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

  getToggleBibleModeAnimationConfig<
    K extends keyof ToggleBibleAnimationConfigType,
  >(key: K): ToggleBibleAnimationConfigType[K] {
    return ToggleBibleAnimationConfigs[key];
  }
}
