import { BibleSetupAnimationConfig } from "bibleStack.infrastructure.config.sequences.bibleSetupAnimation";

export const FocusOnAnimations = {
  bibleSetup: BibleSetupAnimationConfig,
} as const;

export type FocusOnAnimationKey = keyof typeof FocusOnAnimations;
export type FocusOnAnimationConfig =
  (typeof FocusOnAnimations)[FocusOnAnimationKey];
