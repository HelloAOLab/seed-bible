import { BibleSetupAnimationConfig } from "./bibleSetupAnimation";
import { TestamentSelectionAnimationConfig } from "./testamentSelectionAnimation";

export const FocusOnAnimations = {
  bibleSetup: BibleSetupAnimationConfig,
  testamentSelection: TestamentSelectionAnimationConfig,
} as const;

export type FocusOnAnimationKey = keyof typeof FocusOnAnimations;
export type FocusOnAnimationConfig =
  (typeof FocusOnAnimations)[FocusOnAnimationKey];
